import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InvitationStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  @Interval(60_000)
  async cleanup(): Promise<void> {
    const now = new Date();
    await Promise.all([
      this.prisma.idempotencyRecord.deleteMany({ where: { expiresAt: { lte: now } } }),
      this.prisma.staffInvitation.updateMany({ where: { status: InvitationStatus.PENDING, expiresAt: { lte: now } }, data: { status: InvitationStatus.EXPIRED, dedupKey: null } })
    ]);
    const pending = await this.prisma.mediaDeletion.findMany({ where: { nextRetryAt: { lte: now } }, take: 20 });
    for (const item of pending) {
      try {
        await this.storage.remove(item.objectKey);
        await this.prisma.mediaDeletion.delete({ where: { id: item.id } });
      } catch (error) {
        await this.prisma.mediaDeletion.update({ where: { id: item.id }, data: { attempts: { increment: 1 }, lastError: String(error), nextRetryAt: new Date(Date.now() + Math.min(3600, 2 ** item.attempts * 30) * 1000) } });
      }
    }
  }
}
