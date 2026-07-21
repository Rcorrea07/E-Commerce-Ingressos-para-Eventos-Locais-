import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class OrganizerActivationResponseDto extends createZodDto(z.object({
  activated: z.literal(true),
  roles: z.array(z.string()).min(1)
})) {}
