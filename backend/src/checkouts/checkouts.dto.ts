import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { dateTimeSchema } from '../common/openapi.dto.js';

export class CreateCheckoutDto extends createZodDto(z.object({
  eventId: z.uuid(),
  items: z.array(z.object({ ticketTypeId: z.uuid(), quantity: z.number().int().min(1).max(100) })).min(1).max(20)
}).refine((value) => new Set(value.items.map((item) => item.ticketTypeId)).size === value.items.length, {
  message: 'Um tipo de ingresso não pode aparecer mais de uma vez.', path: ['items']
})) {}

const checkoutStatusSchema = z.enum(['ACTIVE', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'ABANDONED']);
const paymentStatusSchema = z.enum(['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED']);
const checkoutResponseSchema = z.object({
  id: z.uuid(),
  status: checkoutStatusSchema,
  event: z.object({ id: z.uuid(), title: z.string(), slug: z.string(), startsAt: dateTimeSchema }).optional(),
  items: z.array(z.object({ checkoutId: z.uuid(), ticketTypeId: z.uuid(), quantity: z.number().int(), unitPriceCents: z.number().int(), ticketTypeName: z.string() })),
  totalCents: z.number().int(),
  currency: z.literal('BRL'),
  payment: z.object({ provider: z.string(), status: paymentStatusSchema.nullable() }).optional(),
  serverTime: dateTimeSchema,
  expiresAt: dateTimeSchema,
  presenceExpiresAt: dateTimeSchema,
  createdAt: dateTimeSchema
});

export class CheckoutResponseDto extends createZodDto(checkoutResponseSchema) {}
export class PaymentSessionResponseDto extends createZodDto(z.object({
  provider: z.enum(['FREE', 'SIMULATED', 'STRIPE_TEST']),
  status: paymentStatusSchema,
  requiresAction: z.boolean(),
  clientSecret: z.string().optional(),
  publishableKey: z.string().optional()
})) {}
export class PaymentWebhookResponseDto extends createZodDto(z.object({ received: z.literal(true) })) {}
export class HeartbeatResponseDto extends createZodDto(z.object({ id: z.uuid(), serverTime: dateTimeSchema, presenceExpiresAt: dateTimeSchema })) {}
export class CheckoutStatusResponseDto extends createZodDto(z.object({ id: z.uuid(), status: checkoutStatusSchema })) {}
