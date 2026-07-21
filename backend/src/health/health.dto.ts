import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { dateTimeSchema } from '../common/openapi.dto.js';

export class LiveHealthResponseDto extends createZodDto(z.object({ status: z.literal('ok'), timestamp: dateTimeSchema })) {}
export class ReadyHealthResponseDto extends createZodDto(z.object({ status: z.literal('ready'), checks: z.object({ mysql: z.literal('up'), minio: z.literal('up') }), timestamp: dateTimeSchema })) {}
