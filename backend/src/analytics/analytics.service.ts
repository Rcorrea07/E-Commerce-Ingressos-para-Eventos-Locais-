import { ForbiddenException, Injectable } from '@nestjs/common';
import { CheckoutStatus, OrderStatus, TicketUnitStatus } from '../generated/prisma/client.js';
import { hasRole, type SessionUser } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AnalyticsQueryDto } from './analytics.dto.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: SessionUser, query: AnalyticsQueryDto, global = false) {
    if (global && !hasRole(user, 'admin')) throw new ForbiddenException();
    const eventWhere = global ? (query.eventId ? { id: query.eventId } : {}) : { organizerId: user.id, ...(query.eventId ? { id: query.eventId } : {}) };
    const events = await this.prisma.event.findMany({ where: eventWhere, select: { id: true, title: true } });
    const eventIds = events.map((event) => event.id);
    const date = { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) };
    const [checkoutGroups, orders, ticketTypes, validations, ranking] = await Promise.all([
      this.prisma.checkout.groupBy({ by: ['status'], where: { eventId: { in: eventIds }, ...(query.from || query.to ? { createdAt: date } : {}) }, _count: true }),
      this.prisma.order.aggregate({ where: { eventId: { in: eventIds }, status: OrderStatus.CONFIRMED, ...(query.from || query.to ? { createdAt: date } : {}) }, _count: true, _sum: { totalCents: true } }),
      this.prisma.ticketType.findMany({ where: { eventId: { in: eventIds } }, select: { id: true, name: true, capacity: true, event: { select: { id: true, title: true } }, _count: { select: { units: { where: { status: TicketUnitStatus.SOLD } } } } } }),
      this.prisma.issuedTicket.findMany({ where: { eventId: { in: eventIds }, status: 'USED', ...(query.from || query.to ? { validatedAt: date } : {}) }, select: { validatedAt: true } }),
      this.prisma.order.groupBy({ by: ['eventId'], where: { eventId: { in: eventIds }, status: OrderStatus.CONFIRMED, ...(query.from || query.to ? { createdAt: date } : {}) }, _count: true, _sum: { totalCents: true }, orderBy: { _sum: { totalCents: 'desc' } }, take: 10 })
    ]);
    const funnel = Object.fromEntries(Object.values(CheckoutStatus).map((status) => [status.toLowerCase(), checkoutGroups.find((group) => group.status === status)?._count ?? 0]));
    const started = Object.values(funnel).reduce((sum, count) => sum + Number(count), 0);
    const byHour = validations.reduce<Record<string, number>>((acc, item) => {
      if (!item.validatedAt) return acc;
      const hour = item.validatedAt.toISOString().slice(0, 13) + ':00:00Z';
      acc[hour] = (acc[hour] ?? 0) + 1;
      return acc;
    }, {});
    return {
      summary: { events: events.length, confirmedOrders: orders._count, netRevenueCents: orders._sum.totalCents ?? 0, currency: 'BRL' },
      funnel: { ...funnel, started, conversionRate: started ? Number(funnel.confirmed ?? 0) / started : 0 },
      occupancy: ticketTypes.map((type) => ({ eventId: type.event.id, event: type.event.title, ticketTypeId: type.id, ticketType: type.name, capacity: type.capacity, sold: type._count.units, rate: type.capacity ? type._count.units / type.capacity : 0 })),
      ranking: ranking.map((row) => ({ eventId: row.eventId, event: events.find((event) => event.id === row.eventId)?.title, orders: row._count, revenueCents: row._sum.totalCents ?? 0 })),
      validationsByHour: Object.entries(byHour).map(([hour, count]) => ({ hour, count }))
    };
  }
}
