import { ConflictException, GoneException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { AuditAction, CheckoutStatus, EventStatus, Prisma, TicketUnitStatus } from '../generated/prisma/client.js';
import { AuditService } from '../common/audit.service.js';
import { assertIdempotencyKey } from '../common/idempotency.js';
import { ProblemException } from '../common/problem.exception.js';
import type { SessionUser } from '../common/request-context.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../database/prisma.service.js';
import { PAYMENT_GATEWAY, type PaymentGateway } from '../payments/payment.gateway.js';
import { decryptPii } from '../security/pii.js';
import type { CreateCheckoutDto } from './checkouts.dto.js';

@Injectable()
export class CheckoutsService {
  private readonly ttlSeconds: number;
  private readonly presenceSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly audit: AuditService,
    @Inject(PAYMENT_GATEWAY) private readonly payment: PaymentGateway
  ) {
    this.ttlSeconds = config.get('CHECKOUT_TTL_SECONDS', { infer: true });
    this.presenceSeconds = config.get('CHECKOUT_PRESENCE_SECONDS', { infer: true });
  }

  private presentAfter(date: Date): Date { return new Date(date.getTime() + this.presenceSeconds * 1000); }

  private serialize(checkout: any) {
    return {
      id: checkout.id,
      status: checkout.status,
      event: checkout.event ? { id: checkout.event.id, title: checkout.event.title, slug: checkout.event.slug, startsAt: checkout.event.startsAt } : undefined,
      items: checkout.items,
      totalCents: checkout.totalCents,
      currency: 'BRL',
      serverTime: new Date(),
      expiresAt: checkout.expiresAt,
      presenceExpiresAt: this.presentAfter(checkout.lastHeartbeatAt),
      createdAt: checkout.createdAt
    };
  }

  private include = { event: true, items: true } as const;

  async create(user: SessionUser, key: string, input: CreateCheckoutDto) {
    assertIdempotencyKey(key);
    const prior = await this.prisma.idempotencyRecord.findUnique({ where: { userId_scope_key: { userId: user.id, scope: 'checkout:create', key } } });
    if (prior?.resourceId) return this.get(user.id, prior.resourceId);
    const checkoutId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlSeconds * 1000);

    try {
      await this.withDeadlockRetry(() => this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM User WHERE id = ${user.id} FOR UPDATE`);
        const account = await tx.user.findUnique({ where: { id: user.id }, include: { profile: true } });
        if (!account) throw new NotFoundException('Usuário não encontrado.');
        if (!account.emailVerified) throw new ProblemException('EMAIL_NOT_VERIFIED', 'Confirme seu e-mail antes de iniciar o checkout.', 422);
        if (!account.profile) throw new ProblemException('PROFILE_INCOMPLETE', 'Complete CPF, telefone e endereço antes de iniciar o checkout.', 422);

        const active = await tx.checkout.findFirst({ where: { userId: user.id, status: CheckoutStatus.ACTIVE }, orderBy: { createdAt: 'desc' } });
        if (active) {
          const stale = active.expiresAt <= now || this.presentAfter(active.lastHeartbeatAt) <= now;
          if (!stale) throw new ProblemException('ACTIVE_CHECKOUT_EXISTS', 'Já existe um checkout ativo.', 409, { activeCheckoutId: active.id });
          await tx.ticketUnit.updateMany({ where: { checkoutId: active.id, status: TicketUnitStatus.HELD }, data: { status: TicketUnitStatus.AVAILABLE, checkoutId: null } });
          await tx.checkout.update({ where: { id: active.id }, data: { status: active.expiresAt <= now ? CheckoutStatus.EXPIRED : CheckoutStatus.ABANDONED, terminalReason: active.expiresAt <= now ? 'TTL_EXPIRED' : 'PRESENCE_LOST' } });
        }

        await tx.$queryRaw(Prisma.sql`SELECT id FROM Event WHERE id = ${input.eventId} FOR SHARE`);
        const event = await tx.event.findUnique({ where: { id: input.eventId } });
        if (!event || event.status !== EventStatus.PUBLISHED) throw new ProblemException('EVENT_NOT_AVAILABLE', 'Evento indisponível para venda.', 409);
        if (event.startsAt <= now) throw new ProblemException('EVENT_ALREADY_STARTED', 'O evento já começou.', 409);

        const requested = [...input.items].sort((a, b) => a.ticketTypeId.localeCompare(b.ticketTypeId));
        const types = await tx.ticketType.findMany({ where: { id: { in: requested.map((item) => item.ticketTypeId) }, eventId: event.id, active: true } });
        if (types.length !== requested.length) throw new ProblemException('INVALID_TICKET_TYPE', 'Um ou mais tipos não pertencem a este evento.', 422);
        const byId = new Map(types.map((type) => [type.id, type]));
        let totalCents = 0;
        for (const item of requested) {
          const type = byId.get(item.ticketTypeId)!;
          if (item.quantity > type.maxPerOrder) throw new ProblemException('PURCHASE_LIMIT_EXCEEDED', `O limite para ${type.name} é ${type.maxPerOrder}.`, 422);
          if (type.saleStartsAt && type.saleStartsAt > now) throw new ProblemException('SALE_NOT_STARTED', `As vendas de ${type.name} ainda não começaram.`, 409);
          if (type.saleEndsAt && type.saleEndsAt <= now) throw new ProblemException('SALE_ENDED', `As vendas de ${type.name} foram encerradas.`, 409);
          totalCents += type.priceCents * item.quantity;
        }

        await tx.checkout.create({ data: { id: checkoutId, userId: user.id, eventId: event.id, totalCents, expiresAt, lastHeartbeatAt: now } });
        for (const item of requested) {
          const type = byId.get(item.ticketTypeId)!;
          const units = await tx.$queryRaw<Array<{ sequence: number }>>(Prisma.sql`
            SELECT sequence FROM TicketUnit
            WHERE ticketTypeId = ${item.ticketTypeId} AND status = 'AVAILABLE'
            ORDER BY sequence LIMIT ${item.quantity}
            FOR UPDATE SKIP LOCKED
          `);
          if (units.length !== item.quantity) throw new ProblemException('STOCK_UNAVAILABLE', `Não há unidades suficientes de ${type.name}.`, 409, { ticketTypeId: type.id, available: units.length });
          const updated = await tx.ticketUnit.updateMany({
            where: { ticketTypeId: type.id, sequence: { in: units.map((unit) => Number(unit.sequence)) }, status: TicketUnitStatus.AVAILABLE },
            data: { status: TicketUnitStatus.HELD, checkoutId }
          });
          if (updated.count !== item.quantity) throw new ConflictException('O estoque mudou durante a reserva. Tente novamente.');
          await tx.checkoutItem.create({ data: { checkoutId, ticketTypeId: type.id, quantity: item.quantity, unitPriceCents: type.priceCents, ticketTypeName: type.name } });
        }
        await tx.idempotencyRecord.create({ data: { userId: user.id, scope: 'checkout:create', key, resourceId: checkoutId, responseCode: 201, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10_000 }));
    } catch (error) {
      const raced = await this.prisma.idempotencyRecord.findUnique({ where: { userId_scope_key: { userId: user.id, scope: 'checkout:create', key } } });
      if (raced?.resourceId) return this.get(user.id, raced.resourceId);
      throw error;
    }
    await this.audit.write({ actorId: user.id, action: AuditAction.CHECKOUT_CREATED, entityType: 'Checkout', entityId: checkoutId });
    return this.get(user.id, checkoutId);
  }

  async active(userId: string) {
    const checkout = await this.prisma.checkout.findFirst({ where: { userId, status: CheckoutStatus.ACTIVE }, include: this.include, orderBy: { createdAt: 'desc' } });
    if (!checkout) return null;
    if (checkout.expiresAt <= new Date() || this.presentAfter(checkout.lastHeartbeatAt) <= new Date()) {
      await this.release(checkout.id, checkout.expiresAt <= new Date() ? CheckoutStatus.EXPIRED : CheckoutStatus.ABANDONED);
      return null;
    }
    return this.serialize(checkout);
  }

  async get(userId: string, checkoutId: string) {
    const checkout = await this.prisma.checkout.findFirst({ where: { id: checkoutId, userId }, include: this.include });
    if (!checkout) throw new NotFoundException('Checkout não encontrado.');
    return this.serialize(checkout);
  }

  async heartbeat(userId: string, checkoutId: string) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.presenceSeconds * 1000);
    const result = await this.prisma.checkout.updateMany({
      where: { id: checkoutId, userId, status: CheckoutStatus.ACTIVE, expiresAt: { gt: now }, lastHeartbeatAt: { gt: cutoff } },
      data: { lastHeartbeatAt: now }
    });
    if (!result.count) {
      const checkout = await this.prisma.checkout.findFirst({ where: { id: checkoutId, userId } });
      if (!checkout) throw new NotFoundException('Checkout não encontrado.');
      if (checkout.status === CheckoutStatus.ACTIVE) await this.release(checkout.id, checkout.expiresAt <= now ? CheckoutStatus.EXPIRED : CheckoutStatus.ABANDONED);
      throw new GoneException('Checkout expirado ou sem presença ativa.');
    }
    return { id: checkoutId, serverTime: now, presenceExpiresAt: this.presentAfter(now) };
  }

  async cancel(userId: string, checkoutId: string) {
    const changed = await this.release(checkoutId, CheckoutStatus.CANCELLED, userId);
    if (changed) await this.audit.write({ actorId: userId, action: AuditAction.CHECKOUT_CANCELLED, entityType: 'Checkout', entityId: checkoutId });
    return { id: checkoutId, status: changed ? CheckoutStatus.CANCELLED : (await this.get(userId, checkoutId)).status };
  }

  async confirm(user: SessionUser, checkoutId: string, key: string) {
    assertIdempotencyKey(key);
    const prior = await this.prisma.idempotencyRecord.findUnique({ where: { userId_scope_key: { userId: user.id, scope: 'checkout:confirm', key } } });
    if (prior?.resourceId) return this.prisma.order.findUnique({ where: { id: prior.resourceId }, include: { items: { include: { tickets: true } } } });
    const candidate = await this.prisma.checkout.findFirst({ where: { id: checkoutId, userId: user.id }, include: { event: true } });
    if (!candidate) throw new NotFoundException('Checkout não encontrado.');
    if (candidate.status !== CheckoutStatus.ACTIVE) throw new ConflictException('Checkout não está ativo.');
    const authorization = await this.payment.authorize({ checkoutId, amountCents: candidate.totalCents, currency: 'BRL' });
    if (!authorization.approved) throw new ConflictException('Confirmação simulada recusada.');
    const orderId = randomUUID();
    const publicId = `ORD-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;

    await this.withDeadlockRetry(() => this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM Event WHERE id = ${candidate.eventId} FOR SHARE`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM Checkout WHERE id = ${checkoutId} FOR UPDATE`);
      const checkout = await tx.checkout.findFirst({ where: { id: checkoutId, userId: user.id }, include: { items: true, event: true, user: { include: { profile: true } }, units: true } });
      if (!checkout) throw new NotFoundException('Checkout não encontrado.');
      const now = new Date();
      if (checkout.event.status !== EventStatus.PUBLISHED) throw new ConflictException('O evento não está mais disponível para confirmação.');
      if (checkout.status !== CheckoutStatus.ACTIVE || checkout.expiresAt <= now || this.presentAfter(checkout.lastHeartbeatAt) <= now) throw new GoneException('Checkout expirado antes da confirmação.');
      if (!checkout.user.profile) throw new UnprocessableEntityException('Perfil incompleto.');
      const cpf = decryptPii(checkout.user.profile.cpfEncrypted, this.config.get('PII_ENCRYPTION_KEY', { infer: true }));
      await tx.order.create({
        data: {
          id: orderId,
          publicId,
          checkoutId,
          userId: user.id,
          eventId: checkout.eventId,
          totalCents: checkout.totalCents,
          eventTitle: checkout.event.title,
          eventStartsAt: checkout.event.startsAt,
          customerName: checkout.user.name,
          customerEmail: checkout.user.email,
          customerCpfLast4: cpf.slice(-4),
          customerSnapshot: {
            phone: checkout.user.profile.phone,
            postalCode: checkout.user.profile.postalCode,
            street: checkout.user.profile.street,
            number: checkout.user.profile.number,
            complement: checkout.user.profile.complement,
            district: checkout.user.profile.district,
            city: checkout.user.profile.city,
            state: checkout.user.profile.state
          },
          paymentProvider: authorization.provider
        }
      });
      for (const item of checkout.items) {
        const orderItem = await tx.orderItem.create({ data: { orderId, ticketTypeId: item.ticketTypeId, ticketTypeName: item.ticketTypeName, unitPriceCents: item.unitPriceCents, quantity: item.quantity } });
        const units = checkout.units.filter((unit) => unit.ticketTypeId === item.ticketTypeId);
        await tx.issuedTicket.createMany({ data: units.map((unit) => ({ publicId: `TKT-${randomUUID()}`, orderItemId: orderItem.id, ownerId: user.id, eventId: checkout.eventId, ticketTypeId: item.ticketTypeId, unitSequence: unit.sequence })) });
      }
      await tx.ticketUnit.updateMany({ where: { checkoutId, status: TicketUnitStatus.HELD }, data: { status: TicketUnitStatus.SOLD, checkoutId: null } });
      await tx.checkout.update({ where: { id: checkoutId }, data: { status: CheckoutStatus.CONFIRMED, confirmedAt: now, terminalReason: null } });
      await tx.idempotencyRecord.create({ data: { userId: user.id, scope: 'checkout:confirm', key, resourceId: orderId, responseCode: 201, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10_000 }));
    await this.audit.write({ actorId: user.id, action: AuditAction.ORDER_CONFIRMED, entityType: 'Order', entityId: orderId, metadata: { checkoutId } });
    return this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { include: { tickets: true } } } });
  }

  @Interval(10_000)
  async releaseStale(): Promise<void> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.presenceSeconds * 1000);
    const stale = await this.prisma.checkout.findMany({
      where: { status: CheckoutStatus.ACTIVE, OR: [{ expiresAt: { lte: now } }, { lastHeartbeatAt: { lte: cutoff } }] },
      select: { id: true, expiresAt: true },
      orderBy: { createdAt: 'asc' },
      take: 100
    });
    for (const checkout of stale) await this.release(checkout.id, checkout.expiresAt <= now ? CheckoutStatus.EXPIRED : CheckoutStatus.ABANDONED);
  }

  private async release(checkoutId: string, status: CheckoutStatus, userId?: string): Promise<boolean> {
    return this.withDeadlockRetry(() => this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM Checkout WHERE id = ${checkoutId} FOR UPDATE`);
      const checkout = await tx.checkout.findFirst({ where: { id: checkoutId, ...(userId ? { userId } : {}) } });
      if (!checkout) {
        if (userId) throw new NotFoundException('Checkout não encontrado.');
        return false;
      }
      if (checkout.status !== CheckoutStatus.ACTIVE) return false;
      await tx.ticketUnit.updateMany({ where: { checkoutId, status: TicketUnitStatus.HELD }, data: { status: TicketUnitStatus.AVAILABLE, checkoutId: null } });
      await tx.checkout.update({ where: { id: checkoutId }, data: { status, terminalReason: status === CheckoutStatus.EXPIRED ? 'TTL_EXPIRED' : status === CheckoutStatus.ABANDONED ? 'PRESENCE_LOST' : 'USER_CANCELLED' } });
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }));
  }

  private async withDeadlockRetry<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (true) {
      try { return await operation(); }
      catch (error) {
        const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (!retryable || attempt >= 2) throw error;
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, 20 * attempt + Math.floor(Math.random() * 30)));
      }
    }
  }
}
