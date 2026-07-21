import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CheckoutStatus, OrderStatus, TicketStatus, TicketUnitStatus } from '../generated/prisma/client.js';
import { hasRole, type SessionUser } from '../common/request-context.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AnalyticsQueryDto } from './analytics.dto.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService<Env, true>) {}

  async get(user: SessionUser, query: AnalyticsQueryDto, global = false) {
    if (global && !hasRole(user, 'admin')) throw new ForbiddenException();
    const eventWhere = global ? (query.eventId ? { id: query.eventId } : {}) : { organizerId: user.id, ...(query.eventId ? { id: query.eventId } : {}) };
    const events = await this.prisma.event.findMany({ where: eventWhere, select: { id: true, title: true } });
    const eventIds = events.map((event) => event.id);
    const date = { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) };
    const createdAt = query.from || query.to ? { createdAt: date } : {};
    const validatedAt = query.from || query.to ? { validatedAt: date } : {};
    const now = new Date();
    const presenceCutoff = new Date(now.getTime() - this.config.get('CHECKOUT_PRESENCE_SECONDS', { infer: true }) * 1000);

    const [
      checkoutGroups,
      activeReservations,
      allOrders,
      confirmedOrders,
      issuedTickets,
      usedTickets,
      ticketTypes,
      unitGroups,
      validations,
      ranking,
      recentOrders
    ] = await Promise.all([
      this.prisma.checkout.groupBy({ by: ['status'], where: { eventId: { in: eventIds }, ...createdAt }, _count: true }),
      this.prisma.checkout.count({ where: { eventId: { in: eventIds }, status: CheckoutStatus.ACTIVE, expiresAt: { gt: now }, lastHeartbeatAt: { gt: presenceCutoff } } }),
      this.prisma.order.count({ where: { eventId: { in: eventIds }, ...createdAt } }),
      this.prisma.order.aggregate({ where: { eventId: { in: eventIds }, status: OrderStatus.CONFIRMED, ...createdAt }, _count: true, _sum: { totalCents: true } }),
      this.prisma.issuedTicket.count({ where: { eventId: { in: eventIds }, ...createdAt } }),
      this.prisma.issuedTicket.count({ where: { eventId: { in: eventIds }, status: TicketStatus.USED, ...validatedAt } }),
      this.prisma.ticketType.findMany({ where: { eventId: { in: eventIds } }, select: { id: true, name: true, capacity: true, event: { select: { id: true, title: true } } } }),
      this.prisma.ticketUnit.groupBy({ by: ['ticketTypeId', 'status'], where: { ticketType: { eventId: { in: eventIds } } }, _count: true }),
      this.prisma.issuedTicket.findMany({ where: { eventId: { in: eventIds }, status: TicketStatus.USED, ...validatedAt }, select: { validatedAt: true } }),
      this.prisma.order.groupBy({ by: ['eventId'], where: { eventId: { in: eventIds }, status: OrderStatus.CONFIRMED, ...createdAt }, _count: true, _sum: { totalCents: true }, orderBy: { _sum: { totalCents: 'desc' } }, take: 10 }),
      this.prisma.order.findMany({
        where: { eventId: { in: eventIds }, ...createdAt },
        select: { id: true, publicId: true, eventId: true, eventTitle: true, customerName: true, status: true, totalCents: true, currency: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    const funnel = Object.fromEntries(Object.values(CheckoutStatus).map((status) => [status.toLowerCase(), checkoutGroups.find((group) => group.status === status)?._count ?? 0]));
    const started = Object.values(funnel).reduce((sum, count) => sum + Number(count), 0);
    const countsByType = new Map<string, Record<TicketUnitStatus, number>>();
    for (const type of ticketTypes) countsByType.set(type.id, { AVAILABLE: 0, HELD: 0, SOLD: 0 });
    for (const group of unitGroups) countsByType.get(group.ticketTypeId)![group.status] = group._count;
    const occupancy = ticketTypes.map((type) => {
      const counts = countsByType.get(type.id)!;
      return {
        eventId: type.event.id,
        event: type.event.title,
        ticketTypeId: type.id,
        ticketType: type.name,
        capacity: type.capacity,
        available: counts.AVAILABLE,
        held: counts.HELD,
        sold: counts.SOLD,
        rate: type.capacity ? counts.SOLD / type.capacity : 0
      };
    });
    const availability = events.map((event) => {
      const types = occupancy.filter((item) => item.eventId === event.id);
      return {
        eventId: event.id,
        event: event.title,
        capacity: types.reduce((sum, item) => sum + item.capacity, 0),
        available: types.reduce((sum, item) => sum + item.available, 0),
        held: types.reduce((sum, item) => sum + item.held, 0),
        sold: types.reduce((sum, item) => sum + item.sold, 0)
      };
    });
    const byHour = validations.reduce<Record<string, number>>((acc, item) => {
      if (!item.validatedAt) return acc;
      const hour = item.validatedAt.toISOString().slice(0, 13) + ':00:00Z';
      acc[hour] = (acc[hour] ?? 0) + 1;
      return acc;
    }, {});

    return {
      summary: {
        totalEvents: events.length,
        totalOrders: allOrders,
        confirmedOrders: confirmedOrders._count,
        issuedTickets,
        usedTickets,
        activeReservations,
        netRevenueCents: confirmedOrders._sum.totalCents ?? 0,
        currency: 'BRL'
      },
      funnel: { ...funnel, started, conversionRate: started ? Number(funnel.confirmed ?? 0) / started : 0 },
      availability,
      occupancy,
      ranking: ranking.map((row) => ({ eventId: row.eventId, event: events.find((event) => event.id === row.eventId)?.title, orders: row._count, revenueCents: row._sum.totalCents ?? 0 })),
      validationsByHour: Object.entries(byHour).map(([hour, count]) => ({ hour, count })),
      recentOrders
    };
  }
}
