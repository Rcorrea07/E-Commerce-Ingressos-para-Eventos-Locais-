import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const address = {
  venueName: z.string().trim().min(2).max(180),
  postalCode: z.string().regex(/^\d{8}$/),
  street: z.string().trim().min(2).max(180),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(100).optional(),
  district: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  state: z.string().length(2).transform((value) => value.toUpperCase())
};

const eventObjectSchema = z.object({
  categoryId: z.uuid(),
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().min(3).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(20).max(10000),
  ...address,
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  timezone: z.string().default('America/Sao_Paulo')
});

export const createEventSchema = eventObjectSchema.refine((value) => new Date(value.endsAt) > new Date(value.startsAt), { message: 'endsAt deve ser posterior a startsAt', path: ['endsAt'] });

export class CreateEventDto extends createZodDto(createEventSchema) {}
export class UpdateEventDto extends createZodDto(eventObjectSchema.omit({ slug: true }).partial().superRefine((value, context) => {
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    context.addIssue({ code: 'custom', message: 'endsAt deve ser posterior a startsAt', path: ['endsAt'] });
  }
})) {}

export class EventQueryDto extends createZodDto(z.object({
  search: z.string().trim().max(100).optional(),
  categoryId: z.uuid().optional(),
  city: z.string().trim().max(100).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  availability: z.enum(['available', 'sold_out']).optional(),
  sort: z.enum(['startsAt', 'newest']).default('startsAt'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
})) {}

export class CreateCategoryDto extends createZodDto(z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
})) {}

export class UpdateCategoryDto extends createZodDto(z.object({
  name: z.string().trim().min(2).max(80).optional(),
  active: z.boolean().optional()
})) {}

export class CreateTicketTypeDto extends createZodDto(z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  priceCents: z.number().int().min(0).max(100_000_000),
  capacity: z.number().int().min(1).max(100_000),
  maxPerOrder: z.number().int().min(1).max(100).default(10),
  saleStartsAt: z.iso.datetime({ offset: true }).optional(),
  saleEndsAt: z.iso.datetime({ offset: true }).optional()
}).refine((value) => !value.saleStartsAt || !value.saleEndsAt || new Date(value.saleEndsAt) > new Date(value.saleStartsAt), {
  message: 'saleEndsAt deve ser posterior a saleStartsAt', path: ['saleEndsAt']
})) {}

export class UpdateTicketTypeDto extends createZodDto(z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  priceCents: z.number().int().min(0).max(100_000_000).optional(),
  maxPerOrder: z.number().int().min(1).max(100).optional(),
  saleStartsAt: z.iso.datetime({ offset: true }).nullable().optional(),
  saleEndsAt: z.iso.datetime({ offset: true }).nullable().optional(),
  active: z.boolean().optional()
})) {}

export class UpdateCapacityDto extends createZodDto(z.object({ capacity: z.number().int().min(0).max(100_000) })) {}

export class ReorderImagesDto extends createZodDto(z.object({
  imageIds: z.array(z.uuid()).min(1).max(6).refine((ids) => new Set(ids).size === ids.length, 'IDs de imagem duplicados.')
})) {}
