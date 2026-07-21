import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const dateTimeSchema = z.iso.datetime({ offset: true });
export const paginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

export class ProblemDetailsDto extends createZodDto(z.object({
  type: z.url(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  detail: z.string(),
  instance: z.string(),
  requestId: z.string().optional(),
  errors: z.unknown().optional(),
  activeCheckoutId: z.uuid().optional()
})) {}

export class DeletedResponseDto extends createZodDto(z.object({ deleted: z.literal(true) })) {}
