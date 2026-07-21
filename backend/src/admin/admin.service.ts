import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, EventStatus, Prisma } from '../generated/prisma/client.js';
import { ProblemException } from '../common/problem.exception.js';
import type { SessionUser } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import type { AdminEventsQueryDto, AdminOrdersQueryDto, AdminTicketsQueryDto, AdminUsersQueryDto } from './admin.dto.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  async events(query: AdminEventsQueryDto) {
    const where: Prisma.EventWhereInput = {
      ...(query.search ? { OR: [{ title: { contains: query.search } }, { slug: { contains: query.search } }] } : {}),
      ...(query.organizerId ? { organizerId: query.organizerId } : {}),
      ...(query.status ? { status: query.status } : {})
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        select: {
          id: true, organizerId: true, categoryId: true, title: true, slug: true, startsAt: true, endsAt: true,
          status: true, venueName: true, city: true, state: true, submittedAt: true, reviewedAt: true, rejectionReason: true,
          createdAt: true, updatedAt: true, organizer: { select: { id: true, name: true, email: true } },
          _count: { select: { ticketTypes: true, orders: true, tickets: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      })
    ]);
    return this.paginated(data, total, query.page, query.pageSize);
  }

  async event(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true, slug: true, active: true } },
        images: { orderBy: { position: 'asc' } },
        ticketTypes: { include: { _count: { select: { units: true } } }, orderBy: { createdAt: 'asc' } }
      }
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    return {
      ...event,
      images: event.images.map(({ objectKey, ...image }) => ({ ...image, url: this.storage.url(objectKey) })),
      ticketTypes: event.ticketTypes.map(({ _count, ...ticketType }) => ({ ...ticketType, units: _count.units }))
    };
  }

  async approve(actor: SessionUser, id: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM Event WHERE id = ${id} FOR UPDATE`);
      const event = await tx.event.findUnique({ where: { id } });
      if (!event) throw new NotFoundException('Evento não encontrado.');
      if (event.status !== EventStatus.PENDING_REVIEW) {
        throw new ProblemException('EVENT_NOT_PENDING_REVIEW', 'Somente eventos em análise podem ser aprovados.', 409);
      }
      const now = new Date();
      await tx.event.update({
        where: { id },
        data: { status: EventStatus.PUBLISHED, publishedAt: now, reviewedAt: now, reviewedById: actor.id, rejectionReason: null }
      });
      await tx.auditLog.create({ data: { actorId: actor.id, action: AuditAction.EVENT_APPROVED, entityType: 'Event', entityId: id } });
    });
    return this.event(id);
  }

  async reject(actor: SessionUser, id: string, reason: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM Event WHERE id = ${id} FOR UPDATE`);
      const event = await tx.event.findUnique({ where: { id } });
      if (!event) throw new NotFoundException('Evento não encontrado.');
      if (event.status !== EventStatus.PENDING_REVIEW) {
        throw new ProblemException('EVENT_NOT_PENDING_REVIEW', 'Somente eventos em análise podem ser rejeitados.', 409);
      }
      await tx.event.update({
        where: { id },
        data: { status: EventStatus.REJECTED, reviewedAt: new Date(), reviewedById: actor.id, rejectionReason: reason }
      });
      await tx.auditLog.create({ data: { actorId: actor.id, action: AuditAction.EVENT_REJECTED, entityType: 'Event', entityId: id, metadata: { reason } } });
    });
    return this.event(id);
  }

  async orders(query: AdminOrdersQueryDto) {
    const where: Prisma.OrderWhereInput = {
      ...(query.eventId ? { eventId: query.eventId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.status ? { status: query.status } : {})
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        select: {
          id: true, publicId: true, userId: true, eventId: true, status: true, totalCents: true, currency: true,
          eventTitle: true, eventStartsAt: true, customerName: true, customerEmail: true, customerCpfLast4: true,
          paymentProvider: true, createdAt: true, cancelledAt: true,
          items: { select: { id: true, ticketTypeId: true, ticketTypeName: true, unitPriceCents: true, quantity: true, _count: { select: { tickets: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      })
    ]);
    return this.paginated(data, total, query.page, query.pageSize);
  }

  async tickets(query: AdminTicketsQueryDto) {
    const where: Prisma.IssuedTicketWhereInput = {
      ...(query.eventId ? { eventId: query.eventId } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.status ? { status: query.status } : {})
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.issuedTicket.count({ where }),
      this.prisma.issuedTicket.findMany({
        where,
        select: {
          id: true, publicId: true, ownerId: true, eventId: true, ticketTypeId: true, unitSequence: true,
          status: true, validatedAt: true, validatedById: true, createdAt: true,
          event: { select: { title: true, startsAt: true } },
          orderItem: { select: { ticketTypeName: true, order: { select: { publicId: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      })
    ]);
    return this.paginated(data, total, query.page, query.pageSize);
  }

  async users(query: AdminUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...(query.search ? { OR: [{ name: { contains: query.search } }, { email: { contains: query.search } }] } : {}),
      ...(query.role ? { role: { contains: query.role } } : {})
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, emailVerified: true, role: true, banned: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      })
    ]);
    return this.paginated(data, total, query.page, query.pageSize);
  }

  private paginated<T>(data: T[], total: number, page: number, pageSize: number) {
    return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }
}
