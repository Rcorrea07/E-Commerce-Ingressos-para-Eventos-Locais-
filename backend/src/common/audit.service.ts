import { Injectable } from '@nestjs/common';
import type { AuditAction, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: { actorId?: string; action: AuditAction; entityType: string; entityId: string; metadata?: Prisma.InputJsonValue }): Promise<void> {
    await this.prisma.auditLog.create({ data: input });
  }
}
