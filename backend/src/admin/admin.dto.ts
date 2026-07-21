import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const pagination = {
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
};

export class AdminEventsQueryDto extends createZodDto(z.object({
  ...pagination,
  search: z.string().trim().max(100).optional(),
  organizerId: z.uuid().optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'PUBLISHED', 'CANCELLED']).optional()
})) {}

export class RejectEventDto extends createZodDto(z.object({
  reason: z.string().trim().min(10).max(1000)
})) {}

export class AdminOrdersQueryDto extends createZodDto(z.object({
  ...pagination,
  eventId: z.uuid().optional(),
  userId: z.uuid().optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_EVENT']).optional()
})) {}

export class AdminTicketsQueryDto extends createZodDto(z.object({
  ...pagination,
  eventId: z.uuid().optional(),
  ownerId: z.uuid().optional(),
  status: z.enum(['ISSUED', 'USED', 'CANCELLED']).optional()
})) {}

export class AdminUsersQueryDto extends createZodDto(z.object({
  ...pagination,
  search: z.string().trim().max(100).optional(),
  role: z.enum(['customer', 'organizer', 'gate_staff', 'admin']).optional()
})) {}
