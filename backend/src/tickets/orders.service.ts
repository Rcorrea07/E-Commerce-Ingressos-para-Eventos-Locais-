import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditAction, OrderStatus, Prisma, TicketStatus, TicketUnitStatus } from '../generated/prisma/client.js';
import { AuditService } from '../common/audit.service.js';
import { assertIdempotencyKey } from '../common/idempotency.js';
import { hasRole, type SessionUser } from '../common/request-context.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../database/prisma.service.js';
import { ProblemException } from '../common/problem.exception.js';
import { createQrPayload, verifyQrPayload } from './qr.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService<Env, true>, private readonly audit: AuditService) {}

  listOrders(userId: string) {
    return this.prisma.order.findMany({ where: { userId }, include: { event: { select: { slug: true } }, items: { include: { tickets: true } } }, orderBy: { createdAt: 'desc' } });
  }

  async getOrder(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, userId }, include: { items: { include: { tickets: true } } } });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return order;
  }

  async cancelOrder(userId: string, orderId: string, key: string) {
    assertIdempotencyKey(key);
    const prior = await this.prisma.idempotencyRecord.findUnique({ where: { userId_scope_key: { userId, scope: 'order:cancel', key } } });
    if (prior?.resourceId) return this.getOrder(userId, prior.resourceId);
    const target = await this.prisma.order.findFirst({ where: { id: orderId, userId }, select: { eventId: true } });
    if (!target) throw new NotFoundException('Pedido não encontrado.');
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM Event WHERE id = ${target.eventId} FOR SHARE`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM \`Order\` WHERE id = ${orderId} FOR UPDATE`);
      const order = await tx.order.findFirst({ where: { id: orderId, userId }, include: { items: { include: { tickets: true } } } });
      if (!order) throw new NotFoundException('Pedido não encontrado.');
      if (order.status !== OrderStatus.CONFIRMED) return;
      const cutoff = new Date(order.eventStartsAt.getTime() - 48 * 60 * 60 * 1000);
      if (new Date() >= cutoff) throw new ProblemException('ORDER_CANCELLATION_WINDOW_CLOSED', 'O prazo de cancelamento terminou 48 horas antes do evento.', 409);
      if (order.items.some((item) => item.tickets.some((ticket) => ticket.status === TicketStatus.USED))) throw new ProblemException('TICKET_ALREADY_USED', 'Pedido possui ingresso já utilizado.', 409);
      for (const item of order.items) {
        const sequences = item.tickets.map((ticket) => ticket.unitSequence);
        await tx.ticketUnit.updateMany({ where: { ticketTypeId: item.ticketTypeId, sequence: { in: sequences }, status: TicketUnitStatus.SOLD }, data: { status: TicketUnitStatus.AVAILABLE, checkoutId: null } });
      }
      await tx.issuedTicket.updateMany({ where: { orderItem: { orderId }, status: TicketStatus.ISSUED }, data: { status: TicketStatus.CANCELLED } });
      await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED_BY_CUSTOMER, cancelledAt: new Date() } });
      await tx.idempotencyRecord.create({ data: { userId, scope: 'order:cancel', key, resourceId: orderId, responseCode: 200, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    await this.audit.write({ actorId: userId, action: AuditAction.ORDER_CANCELLED, entityType: 'Order', entityId: orderId, metadata: { reason: 'CUSTOMER' } });
    return this.getOrder(userId, orderId);
  }

  async listTickets(userId: string) {
    const tickets = await this.prisma.issuedTicket.findMany({ where: { ownerId: userId }, include: { event: true, orderItem: true }, orderBy: { createdAt: 'desc' } });
    return tickets.map((ticket) => this.withQr(ticket));
  }

  async getTicket(userId: string, id: string) {
    const ticket = await this.prisma.issuedTicket.findFirst({ where: { id, ownerId: userId }, include: { event: true, orderItem: true } });
    if (!ticket) throw new NotFoundException('Ingresso não encontrado.');
    return this.withQr(ticket);
  }

  private withQr<T extends { publicId: string }>(ticket: T) {
    return { ...ticket, qrPayload: createQrPayload(ticket.publicId, this.config.get('QR_SIGNING_SECRET', { infer: true })) };
  }

  async gateEvents(user: SessionUser) {
    if (hasRole(user, 'admin')) return this.prisma.event.findMany({ where: { startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, orderBy: { startsAt: 'asc' } });
    return this.prisma.event.findMany({ where: { OR: [{ organizerId: user.id }, { staff: { some: { userId: user.id } } }] }, orderBy: { startsAt: 'asc' } });
  }

  async validate(user: SessionUser, qrPayload: string) {
    const publicId = verifyQrPayload(qrPayload, this.config.get('QR_SIGNING_SECRET', { infer: true }));
    if (!publicId) throw new UnprocessableEntityException('QR inválido ou adulterado.');
    const existing = await this.prisma.issuedTicket.findUnique({ where: { publicId }, include: { event: true, orderItem: true } });
    if (!existing) throw new NotFoundException('Ingresso não encontrado.');
    const allowed = hasRole(user, 'admin') || existing.event.organizerId === user.id || Boolean(await this.prisma.eventStaff.findUnique({ where: { eventId_userId: { eventId: existing.eventId, userId: user.id } } }));
    if (!allowed) throw new ForbiddenException('Você não está atribuído à portaria deste evento.');

    const ticket = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM Event WHERE id = ${existing.eventId} FOR SHARE`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM \`Order\` WHERE id = ${existing.orderItem.orderId} FOR UPDATE`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM IssuedTicket WHERE id = ${existing.id} FOR UPDATE`);
      const current = await tx.issuedTicket.findUniqueOrThrow({ where: { id: existing.id }, include: { event: true, orderItem: true } });
      if (current.status === TicketStatus.USED) throw new ProblemException('TICKET_ALREADY_USED', `Ingresso já utilizado em ${current.validatedAt?.toISOString()}.`, 409);
      if (current.status === TicketStatus.CANCELLED || current.event.status === 'CANCELLED') throw new ProblemException('TICKET_CANCELLED', 'Ingresso cancelado.', 409);
      return tx.issuedTicket.update({ where: { id: current.id }, data: { status: TicketStatus.USED, validatedAt: new Date(), validatedById: user.id }, include: { event: true, orderItem: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    await this.audit.write({ actorId: user.id, action: AuditAction.TICKET_VALIDATED, entityType: 'IssuedTicket', entityId: ticket.id, metadata: { eventId: ticket.eventId } });
    return { accepted: true, ticket: { id: ticket.id, publicId: ticket.publicId, type: ticket.orderItem.ticketTypeName, event: ticket.event.title, validatedAt: ticket.validatedAt } };
  }
}
