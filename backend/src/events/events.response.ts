import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { dateTimeSchema, paginationSchema } from '../common/openapi.dto.js';

const eventStatusSchema = z.enum(['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'PUBLISHED', 'CANCELLED']);
const categorySchema = z.object({
  id: z.uuid(), name: z.string(), slug: z.string(), active: z.boolean(), createdAt: dateTimeSchema, updatedAt: dateTimeSchema
});
const imageSchema = z.object({
  id: z.uuid(), eventId: z.uuid(), mimeType: z.string(), size: z.number().int(), kind: z.enum(['COVER', 'GALLERY']),
  position: z.number().int(), createdAt: dateTimeSchema, url: z.url().optional()
});
const eventCoreSchema = z.object({
  id: z.uuid(), organizerId: z.uuid(), categoryId: z.uuid(), title: z.string(), slug: z.string(), description: z.string(),
  venueName: z.string(), postalCode: z.string(), street: z.string(), number: z.string(), complement: z.string().nullable(),
  district: z.string(), city: z.string(), state: z.string(), startsAt: dateTimeSchema, endsAt: dateTimeSchema,
  timezone: z.string(), status: eventStatusSchema, publishedAt: dateTimeSchema.nullable(), cancelledAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema, updatedAt: dateTimeSchema
});
const organizerEventCoreSchema = eventCoreSchema.extend({
  submittedAt: dateTimeSchema.nullable(), reviewedAt: dateTimeSchema.nullable(), reviewedById: z.uuid().nullable(), rejectionReason: z.string().nullable()
});
const publicTicketTypeSchema = z.object({
  id: z.uuid(), name: z.string(), description: z.string().nullable(), priceCents: z.number().int(), currency: z.literal('BRL'),
  capacity: z.number().int(), available: z.number().int(), maxPerOrder: z.number().int(), saleStartsAt: dateTimeSchema.nullable(),
  saleEndsAt: dateTimeSchema.nullable(), active: z.boolean()
});
const ticketTypeRecordSchema = z.object({
  id: z.uuid(), eventId: z.uuid(), name: z.string(), description: z.string().nullable(), priceCents: z.number().int(),
  capacity: z.number().int(), maxPerOrder: z.number().int(), saleStartsAt: dateTimeSchema.nullable(), saleEndsAt: dateTimeSchema.nullable(),
  active: z.boolean(), createdAt: dateTimeSchema, updatedAt: dateTimeSchema
});
const publicEventSchema = eventCoreSchema.extend({ category: categorySchema, images: z.array(imageSchema), ticketTypes: z.array(publicTicketTypeSchema), soldOut: z.boolean() });
const organizerEventSchema = organizerEventCoreSchema.extend({ category: categorySchema.optional(), images: z.array(imageSchema).optional(), ticketTypes: z.array(ticketTypeRecordSchema).optional() });

export class CategoryResponseDto extends createZodDto(categorySchema) {}
export class EventRecordResponseDto extends createZodDto(organizerEventCoreSchema) {}
export class PublicEventResponseDto extends createZodDto(publicEventSchema) {}
export class OrganizerEventResponseDto extends createZodDto(organizerEventSchema) {}
export class EventListResponseDto extends createZodDto(z.object({ data: z.array(publicEventSchema), pagination: paginationSchema })) {}
export class TicketTypeResponseDto extends createZodDto(ticketTypeRecordSchema) {}
export class EventImageResponseDto extends createZodDto(imageSchema) {}
export class EventImagesResponseDto extends createZodDto(z.array(imageSchema)) {}
export class EventStatusResponseDto extends createZodDto(z.object({ id: z.uuid(), status: eventStatusSchema })) {}
export class AvailabilityResponseDto extends createZodDto(z.object({
  serverTime: dateTimeSchema,
  data: z.array(z.object({ id: z.uuid(), name: z.string(), capacity: z.number().int(), available: z.number().int() }))
})) {}
