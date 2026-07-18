import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class ValidateTicketDto extends createZodDto(z.object({ qrPayload: z.string().min(20).max(500) })) {}
