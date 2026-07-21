import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { dateTimeSchema, paginationSchema } from '../common/openapi.dto.js';

const adminEventSchema = z.object({
  id: z.uuid(), organizerId: z.uuid(), categoryId: z.uuid(), title: z.string(), slug: z.string(), startsAt: dateTimeSchema,
  endsAt: dateTimeSchema, status: z.enum(['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'PUBLISHED', 'CANCELLED']), venueName: z.string(), city: z.string(), state: z.string(),
  submittedAt: dateTimeSchema.nullable(), reviewedAt: dateTimeSchema.nullable(), rejectionReason: z.string().nullable(),
  createdAt: dateTimeSchema, updatedAt: dateTimeSchema,
  organizer: z.object({ id: z.uuid(), name: z.string(), email: z.email() }),
  _count: z.object({ ticketTypes: z.number().int(), orders: z.number().int(), tickets: z.number().int() })
});
const adminEventDetailsSchema = z.object({
  id: z.uuid(), organizerId: z.uuid(), categoryId: z.uuid(), title: z.string(), slug: z.string(), description: z.string(),
  venueName: z.string(), postalCode: z.string(), street: z.string(), number: z.string(), complement: z.string().nullable(),
  district: z.string(), city: z.string(), state: z.string(), startsAt: dateTimeSchema, endsAt: dateTimeSchema, timezone: z.string(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'PUBLISHED', 'CANCELLED']), submittedAt: dateTimeSchema.nullable(),
  reviewedAt: dateTimeSchema.nullable(), reviewedById: z.uuid().nullable(), rejectionReason: z.string().nullable(),
  publishedAt: dateTimeSchema.nullable(), cancelledAt: dateTimeSchema.nullable(), createdAt: dateTimeSchema, updatedAt: dateTimeSchema,
  organizer: z.object({ id: z.uuid(), name: z.string(), email: z.email() }),
  category: z.object({ id: z.uuid(), name: z.string(), slug: z.string(), active: z.boolean() }),
  images: z.array(z.object({ id: z.uuid(), eventId: z.uuid(), mimeType: z.string(), size: z.number().int(), kind: z.enum(['COVER', 'GALLERY']), position: z.number().int(), createdAt: dateTimeSchema, url: z.url() })),
  ticketTypes: z.array(z.object({
    id: z.uuid(), eventId: z.uuid(), name: z.string(), description: z.string().nullable(), priceCents: z.number().int(), capacity: z.number().int(),
    maxPerOrder: z.number().int(), saleStartsAt: dateTimeSchema.nullable(), saleEndsAt: dateTimeSchema.nullable(), active: z.boolean(),
    createdAt: dateTimeSchema, updatedAt: dateTimeSchema, units: z.number().int()
  }))
});
const adminOrderSchema = z.object({
  id: z.uuid(), publicId: z.string(), userId: z.uuid(), eventId: z.uuid(), status: z.enum(['CONFIRMED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_EVENT']),
  totalCents: z.number().int(), currency: z.literal('BRL'), eventTitle: z.string(), eventStartsAt: dateTimeSchema,
  customerName: z.string(), customerEmail: z.email(), customerCpfLast4: z.string(), paymentProvider: z.string(), createdAt: dateTimeSchema,
  cancelledAt: dateTimeSchema.nullable(),
  items: z.array(z.object({ id: z.uuid(), ticketTypeId: z.uuid(), ticketTypeName: z.string(), unitPriceCents: z.number().int(), quantity: z.number().int(), _count: z.object({ tickets: z.number().int() }) }))
});
const adminTicketSchema = z.object({
  id: z.uuid(), publicId: z.string(), ownerId: z.uuid(), eventId: z.uuid(), ticketTypeId: z.uuid(), unitSequence: z.number().int(),
  status: z.enum(['ISSUED', 'USED', 'CANCELLED']), validatedAt: dateTimeSchema.nullable(), validatedById: z.uuid().nullable(), createdAt: dateTimeSchema,
  event: z.object({ title: z.string(), startsAt: dateTimeSchema }), orderItem: z.object({ ticketTypeName: z.string(), order: z.object({ publicId: z.string() }) })
});
const adminUserSchema = z.object({ id: z.uuid(), name: z.string(), email: z.email(), emailVerified: z.boolean(), role: z.string(), banned: z.boolean(), createdAt: dateTimeSchema });

export class AdminEventsResponseDto extends createZodDto(z.object({ data: z.array(adminEventSchema), pagination: paginationSchema })) {}
export class AdminEventDetailsResponseDto extends createZodDto(adminEventDetailsSchema) {}
export class AdminOrdersResponseDto extends createZodDto(z.object({ data: z.array(adminOrderSchema), pagination: paginationSchema })) {}
export class AdminTicketsResponseDto extends createZodDto(z.object({ data: z.array(adminTicketSchema), pagination: paginationSchema })) {}
export class AdminUsersResponseDto extends createZodDto(z.object({ data: z.array(adminUserSchema), pagination: paginationSchema })) {}
