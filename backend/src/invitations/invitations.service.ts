import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { AuditAction, InvitationStatus, Prisma } from '../generated/prisma/client.js';
import { AuditService } from '../common/audit.service.js';
import { ProblemException } from '../common/problem.exception.js';
import { addRole, hasRole, type SessionUser } from '../common/request-context.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const staffDedupKey = (eventId: string, email: string) => digest(`${eventId}:${normalizeEmail(email)}`);
const invitationSelect = {
  id: true,
  email: true,
  invitedById: true,
  status: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true
} as const;

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService, private readonly config: ConfigService<Env, true>, private readonly audit: AuditService) {}

  async inviteStaff(actor: SessionUser, eventId: string, rawEmail: string) {
    const event = await this.assertEventAccess(actor, eventId);
    const email = normalizeEmail(rawEmail);
    const dedupKey = staffDedupKey(eventId, email);
    await this.expireStaffInvitations(eventId);
    if (await this.prisma.staffInvitation.findUnique({ where: { dedupKey }, select: { id: true } })) this.throwDuplicate();
    const token = randomBytes(32).toString('base64url');
    let invitation;
    try {
      invitation = await this.prisma.staffInvitation.create({ data: { eventId, email, tokenHash: digest(token), dedupKey, invitedById: actor.id, expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) }, select: { ...invitationSelect, eventId: true } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') this.throwDuplicate();
      throw error;
    }
    const url = `${this.config.get('FRONTEND_URL', { infer: true })}/convites/portaria?token=${encodeURIComponent(token)}`;
    await this.mail.send(email, `Convite para a portaria: ${event.title}`, `Entre ou crie sua conta e aceite o convite: ${url}`);
    await this.audit.write({ actorId: actor.id, action: AuditAction.STAFF_INVITED, entityType: 'StaffInvitation', entityId: invitation.id, metadata: { eventId } });
    return invitation;
  }

  async listStaff(actor: SessionUser, eventId: string) {
    await this.assertEventAccess(actor, eventId);
    await this.expireStaffInvitations(eventId);
    return this.prisma.staffInvitation.findMany({ where: { eventId }, select: { ...invitationSelect, eventId: true }, orderBy: { createdAt: 'desc' } });
  }

  async revokeStaff(actor: SessionUser, eventId: string, invitationId: string) {
    await this.assertEventAccess(actor, eventId);
    await this.expireStaffInvitations(eventId);
    const invitation = await this.prisma.staffInvitation.findFirst({ where: { id: invitationId, eventId }, select: { ...invitationSelect, eventId: true } });
    if (!invitation) throw new NotFoundException('Convite não encontrado.');
    if (invitation.status === InvitationStatus.REVOKED) return invitation;
    if (invitation.status !== InvitationStatus.PENDING) this.throwNotPending(invitation.status);
    const revoked = await this.prisma.staffInvitation.update({ where: { id: invitationId }, data: { status: InvitationStatus.REVOKED, dedupKey: null }, select: { ...invitationSelect, eventId: true } });
    await this.audit.write({ actorId: actor.id, action: AuditAction.STAFF_INVITE_REVOKED, entityType: 'StaffInvitation', entityId: invitationId, metadata: { eventId } });
    return revoked;
  }

  async acceptStaff(user: SessionUser, token: string) {
    if (!user.emailVerified) throw new ForbiddenException('Confirme seu e-mail antes de aceitar o convite.');
    const invitation = await this.prisma.staffInvitation.findUnique({ where: { tokenHash: digest(token) } });
    if (!invitation || invitation.status !== InvitationStatus.PENDING) throw new NotFoundException('Convite inválido.');
    if (invitation.expiresAt <= new Date()) {
      await this.prisma.staffInvitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.EXPIRED, dedupKey: null } });
      throw new ProblemException('INVITATION_EXPIRED', 'Convite expirado.', 409);
    }
    if (invitation.email !== normalizeEmail(user.email)) throw new ForbiddenException('O convite pertence a outro e-mail.');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { role: addRole(user.role, 'gate_staff') } }),
      this.prisma.eventStaff.upsert({ where: { eventId_userId: { eventId: invitation.eventId, userId: user.id } }, create: { eventId: invitation.eventId, userId: user.id }, update: {} }),
      this.prisma.staffInvitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date(), dedupKey: null } })
    ]);
    await this.audit.write({ actorId: user.id, action: AuditAction.STAFF_INVITE_ACCEPTED, entityType: 'StaffInvitation', entityId: invitation.id, metadata: { eventId: invitation.eventId } });
    return { accepted: true, role: 'gate_staff', eventId: invitation.eventId };
  }

  private async assertEventAccess(actor: SessionUser, eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, organizerId: true } });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    if (event.organizerId !== actor.id && !hasRole(actor, 'admin')) throw new ForbiddenException('Evento pertence a outro organizador.');
    return event;
  }

  private expireStaffInvitations(eventId: string) {
    return this.prisma.staffInvitation.updateMany({ where: { eventId, status: InvitationStatus.PENDING, expiresAt: { lte: new Date() } }, data: { status: InvitationStatus.EXPIRED, dedupKey: null } });
  }

  private throwDuplicate(): never {
    throw new ProblemException('ACTIVE_INVITATION_EXISTS', 'Já existe um convite pendente para este e-mail.', 409);
  }

  private throwNotPending(status: InvitationStatus): never {
    throw new ProblemException('INVITATION_NOT_PENDING', `O convite está no estado ${status}.`, 409);
  }
}
