import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class AnalyticsQueryDto extends createZodDto(z.object({
  eventId: z.uuid().optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional()
})) {}
