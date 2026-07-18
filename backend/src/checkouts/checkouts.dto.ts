import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class CreateCheckoutDto extends createZodDto(z.object({
  eventId: z.uuid(),
  items: z.array(z.object({ ticketTypeId: z.uuid(), quantity: z.number().int().min(1).max(100) })).min(1).max(20)
}).refine((value) => new Set(value.items.map((item) => item.ticketTypeId)).size === value.items.length, {
  message: 'Um tipo de ingresso não pode aparecer mais de uma vez.', path: ['items']
})) {}
