import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '../generated/prisma/client.js';
import { ProblemException } from '../common/problem.exception.js';
import { addRole, hasRole, type SessionUser } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class OrganizerService {
  constructor(private readonly prisma: PrismaService) {}

  activate(user: SessionUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM User WHERE id = ${user.id} FOR UPDATE`);
      const account = await tx.user.findUnique({ where: { id: user.id }, include: { profile: true } });
      if (!account) throw new NotFoundException('Usuário não encontrado.');
      if (!account.emailVerified) {
        throw new ProblemException('EMAIL_NOT_VERIFIED', 'Confirme seu e-mail antes de ativar a Área do Produtor.', 422);
      }
      if (!account.profile) {
        throw new ProblemException('PROFILE_INCOMPLETE', 'Complete CPF, telefone e endereço antes de ativar a Área do Produtor.', 422);
      }

      if (!hasRole(account, 'organizer')) {
        account.role = addRole(account.role, 'organizer');
        await tx.user.update({ where: { id: account.id }, data: { role: account.role } });
        await tx.auditLog.create({
          data: {
            actorId: account.id,
            action: AuditAction.ORGANIZER_SELF_ACTIVATED,
            entityType: 'User',
            entityId: account.id
          }
        });
      }

      return { activated: true as const, roles: account.role.split(',').map((role) => role.trim()).filter(Boolean) };
    });
  }
}
