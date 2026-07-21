import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { dateTimeSchema } from '../common/openapi.dto.js';

export class ValidateTicketDto extends createZodDto(z.object({ qrPayload: z.string().min(20).max(500) })) {}

const ticketStatusSchema = z.enum(['ISSUED', 'USED', 'CANCELLED']);
const orderStatusSchema = z.enum(['CONFIRMED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_EVENT']);
const issuedTicketSummarySchema = z.object({
  id: z.uuid(), publicId: z.string(), status: ticketStatusSchema, unitSequence: z.number().int(), createdAt: dateTimeSchema, validatedAt: dateTimeSchema.nullable()
});
const orderSchema = z.object({
  id: z.uuid(), publicId: z.string(), status: orderStatusSchema, totalCents: z.number().int(), currency: z.literal('BRL'),
  event: z.object({ id: z.uuid(), title: z.string(), startsAt: dateTimeSchema, slug: z.string().optional() }),
  items: z.array(z.object({
    id: z.uuid(), ticketTypeId: z.uuid(), ticketTypeName: z.string(), unitPriceCents: z.number().int(), quantity: z.number().int(), tickets: z.array(issuedTicketSummarySchema)
  })),
  createdAt: dateTimeSchema,
  cancelledAt: dateTimeSchema.nullable()
});
const ticketSchema = z.object({
  id: z.uuid(), publicId: z.string(), status: ticketStatusSchema, unitSequence: z.number().int(), createdAt: dateTimeSchema,
  validatedAt: dateTimeSchema.nullable(),
  event: z.object({ id: z.uuid(), title: z.string(), slug: z.string(), startsAt: dateTimeSchema, venueName: z.string(), city: z.string(), state: z.string() }),
  ticketType: z.object({ id: z.uuid(), name: z.string() }),
  orderPublicId: z.string(),
  qrPayload: z.string()
});

export class OrderResponseDto extends createZodDto(orderSchema) {}
export class TicketResponseDto extends createZodDto(ticketSchema) {}
export class GateValidationResponseDto extends createZodDto(z.object({
  accepted: z.literal(true),
  ticket: z.object({ id: z.uuid(), publicId: z.string(), type: z.string(), event: z.string(), validatedAt: dateTimeSchema })
})) {}
export class GateEventResponseDto extends createZodDto(z.object({
  id: z.uuid(), title: z.string(), slug: z.string(), startsAt: dateTimeSchema, endsAt: dateTimeSchema,
  venueName: z.string(), city: z.string(), state: z.string(), status: z.enum(['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'PUBLISHED', 'CANCELLED'])
})) {}
