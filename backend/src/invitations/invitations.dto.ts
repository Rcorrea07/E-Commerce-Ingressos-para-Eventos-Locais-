import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { dateTimeSchema } from '../common/openapi.dto.js';

export class InviteDto extends createZodDto(z.object({ email: z.email().transform((value) => value.toLowerCase()) })) {}
export class AcceptInvitationDto extends createZodDto(z.object({ token: z.string().min(32).max(500) })) {}

const invitationSchema = z.object({
  id: z.uuid(), email: z.email(), invitedById: z.uuid(), status: z.enum(['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED']),
  expiresAt: dateTimeSchema, acceptedAt: dateTimeSchema.nullable(), createdAt: dateTimeSchema
});

export class StaffInvitationResponseDto extends createZodDto(invitationSchema.extend({ eventId: z.uuid() })) {}
export class AcceptStaffInvitationResponseDto extends createZodDto(z.object({ accepted: z.literal(true), role: z.literal('gate_staff'), eventId: z.uuid() })) {}
