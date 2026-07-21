import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { dateTimeSchema } from '../common/openapi.dto.js';

export class AnalyticsQueryDto extends createZodDto(z.object({
  eventId: z.uuid().optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional()
})) {}

export class AnalyticsResponseDto extends createZodDto(z.object({
  summary: z.object({
    totalEvents: z.number().int(), totalOrders: z.number().int(), confirmedOrders: z.number().int(), issuedTickets: z.number().int(),
    usedTickets: z.number().int(), activeReservations: z.number().int(), netRevenueCents: z.number().int(), currency: z.literal('BRL')
  }),
  funnel: z.object({
    active: z.number().int(), confirmed: z.number().int(), cancelled: z.number().int(), expired: z.number().int(), abandoned: z.number().int(),
    started: z.number().int(), conversionRate: z.number()
  }),
  availability: z.array(z.object({ eventId: z.uuid(), event: z.string(), capacity: z.number().int(), available: z.number().int(), held: z.number().int(), sold: z.number().int() })),
  occupancy: z.array(z.object({
    eventId: z.uuid(), event: z.string(), ticketTypeId: z.uuid(), ticketType: z.string(), capacity: z.number().int(),
    available: z.number().int(), held: z.number().int(), sold: z.number().int(), rate: z.number()
  })),
  ranking: z.array(z.object({ eventId: z.uuid(), event: z.string().optional(), orders: z.number().int(), revenueCents: z.number().int() })),
  validationsByHour: z.array(z.object({ hour: dateTimeSchema, count: z.number().int() })),
  recentOrders: z.array(z.object({
    id: z.uuid(), publicId: z.string(), eventId: z.uuid(), eventTitle: z.string(), customerName: z.string(),
    status: z.enum(['CONFIRMED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_EVENT']), totalCents: z.number().int(), currency: z.literal('BRL'), createdAt: dateTimeSchema
  }))
})) {}
