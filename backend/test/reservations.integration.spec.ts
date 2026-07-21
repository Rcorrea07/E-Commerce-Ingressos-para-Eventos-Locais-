import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AdminService } from '../src/admin/admin.service.js';
import { AnalyticsService } from '../src/analytics/analytics.service.js';
import { CheckoutsService } from '../src/checkouts/checkouts.service.js';
import { AuditService } from '../src/common/audit.service.js';
import type { SessionUser } from '../src/common/request-context.js';
import type { Env } from '../src/config/env.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { EventsService } from '../src/events/events.service.js';
import { OrganizerService } from '../src/events/organizer.service.js';
import { EventStatus, TicketUnitStatus } from '../src/generated/prisma/client.js';
import { InvitationsService } from '../src/invitations/invitations.service.js';
import type { MailService } from '../src/mail/mail.service.js';
import { SimulatedPaymentGateway } from '../src/payments/payment.gateway.js';
import { encryptPii } from '../src/security/pii.js';
import type { StorageService } from '../src/storage/storage.service.js';
import { OrdersService } from '../src/tickets/orders.service.js';
import { createQrPayload } from '../src/tickets/qr.js';

const run = process.env.RUN_INTEGRATION === 'true';

describe.skipIf(!run)('reservas concorrentes no MySQL', () => {
  let prisma: PrismaService;
  let service: CheckoutsService;
  let orders: OrdersService;
  let invitations: InvitationsService;
  let analytics: AnalyticsService;
  let admin: AdminService;
  let events: EventsService;
  let organizer: OrganizerService;
  let config: ConfigService<Env, true>;
  const marker = randomUUID();
  const userIds: string[] = [];
  const activationUserId = randomUUID();
  const unverifiedUserId = randomUUID();
  const incompleteUserId = randomUUID();
  const extraUserIds = [activationUserId, unverifiedUserId, incompleteUserId];
  let eventId: string;
  let reviewEventId: string | undefined;
  let categoryId: string;
  let ticketTypeId: string;

  beforeAll(async () => {
    config = new ConfigService({
      DB_HOST: process.env.DB_HOST ?? 'localhost',
      DB_PORT: Number(process.env.DB_PORT ?? 3306),
      DB_USER: process.env.DB_USER ?? 'tickets',
      DB_PASSWORD: process.env.DB_PASSWORD ?? 'tickets',
      DB_NAME: process.env.DB_NAME ?? 'tickets',
      FRONTEND_URL: 'http://localhost:3000',
      CHECKOUT_TTL_SECONDS: 900,
      CHECKOUT_PRESENCE_SECONDS: 60
    }) as ConfigService<Env, true>;
    prisma = new PrismaService(config);
    const audit = new AuditService(prisma);
    const storage = {
      url: (key: string) => `http://storage.test/event-media/${key}`,
      put: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined)
    } as unknown as StorageService;
    service = new CheckoutsService(prisma, config, audit, new SimulatedPaymentGateway());
    orders = new OrdersService(prisma, config, audit);
    invitations = new InvitationsService(prisma, { send: vi.fn().mockResolvedValue(undefined) } as unknown as MailService, config, audit);
    analytics = new AnalyticsService(prisma, config);
    admin = new AdminService(prisma, storage);
    events = new EventsService(prisma, storage, audit);
    organizer = new OrganizerService(prisma);

    for (let index = 0; index < 100; index += 1) userIds.push(randomUUID());
    await prisma.user.createMany({ data: userIds.map((id, index) => ({
      id,
      name: `Concorrente ${index}`,
      email: `${marker}-${index}@test.local`,
      emailVerified: true,
      role: 'customer'
    })) });
    await prisma.userProfile.createMany({ data: userIds.map((userId, index) => ({
      userId,
      phone: '11999999999',
      cpfEncrypted: encryptPii('52998224725', process.env.PII_ENCRYPTION_KEY!),
      cpfHash: createHash('sha256').update(`${marker}:${index}`).digest('hex'),
      postalCode: '01001000', street: 'Rua Teste', number: '1', district: 'Centro', city: 'São Paulo', state: 'SP'
    })) });
    await prisma.user.createMany({ data: [
      { id: activationUserId, name: 'Novo produtor', email: `produtor-${marker}@test.local`, emailVerified: true, role: 'customer' },
      { id: unverifiedUserId, name: 'Não verificado', email: `nao-verificado-${marker}@test.local`, emailVerified: false, role: 'customer' },
      { id: incompleteUserId, name: 'Perfil incompleto', email: `incompleto-${marker}@test.local`, emailVerified: true, role: 'customer' }
    ] });
    await prisma.userProfile.createMany({ data: [activationUserId, unverifiedUserId].map((userId, index) => ({
      userId,
      phone: '11999999999',
      cpfEncrypted: encryptPii('52998224725', process.env.PII_ENCRYPTION_KEY!),
      cpfHash: createHash('sha256').update(`${marker}:extra:${index}`).digest('hex'),
      postalCode: '01001000', street: 'Rua Teste', number: '1', district: 'Centro', city: 'São Paulo', state: 'SP'
    })) });
    const category = await prisma.eventCategory.create({ data: { name: `Teste ${marker}`, slug: `test-${marker}` } });
    categoryId = category.id;
    const event = await prisma.event.create({ data: {
      organizerId: userIds[0]!, categoryId, title: 'Concorrência', slug: `concurrency-${marker}`,
      description: 'Evento criado exclusivamente para o teste de concorrência.', venueName: 'Local', postalCode: '01001000',
      street: 'Rua Teste', number: '1', district: 'Centro', city: 'São Paulo', state: 'SP',
      startsAt: new Date(Date.now() + 7 * 86_400_000), endsAt: new Date(Date.now() + 7 * 86_400_000 + 3_600_000), status: EventStatus.PUBLISHED
    } });
    eventId = event.id;
    const type = await prisma.ticketType.create({ data: { eventId, name: 'Único', priceCents: 1000, capacity: 10, maxPerOrder: 1 } });
    ticketTypeId = type.id;
    await prisma.ticketUnit.createMany({ data: Array.from({ length: 10 }, (_, index) => ({ ticketTypeId, sequence: index + 1 })) });
  }, 30_000);

  afterAll(async () => {
    await prisma.staffInvitation.deleteMany({ where: { invitedById: { in: [...userIds, ...extraUserIds] } } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: [...userIds, ...extraUserIds] } } });
    await prisma.idempotencyRecord.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.ticketUnit.updateMany({ where: { ticketTypeId }, data: { status: TicketUnitStatus.AVAILABLE, checkoutId: null } });
    await prisma.issuedTicket.deleteMany({ where: { eventId } });
    await prisma.orderItem.deleteMany({ where: { order: { eventId } } });
    await prisma.order.deleteMany({ where: { eventId } });
    await prisma.checkoutItem.deleteMany({ where: { checkout: { eventId } } });
    await prisma.checkout.deleteMany({ where: { eventId } });
    await prisma.ticketUnit.deleteMany({ where: { ticketTypeId } });
    await prisma.ticketType.deleteMany({ where: { eventId } });
    if (reviewEventId) await prisma.event.delete({ where: { id: reviewEventId } });
    await prisma.event.delete({ where: { id: eventId } });
    await prisma.eventCategory.delete({ where: { id: categoryId } });
    await prisma.userProfile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userProfile.deleteMany({ where: { userId: { in: extraUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: extraUserIds } } });
    await prisma.$disconnect();
  }, 30_000);

  it('100 checkouts sobre 10 unidades criam exatamente 10 reservas', async () => {
    const attempts = userIds.map((id, index) => {
      const user: SessionUser = { id, name: `Concorrente ${index}`, email: `${marker}-${index}@test.local`, emailVerified: true, role: 'customer' };
      return service.create(user, randomUUID(), { eventId, items: [{ ticketTypeId, quantity: 1 }] });
    });
    const results = await Promise.allSettled(attempts);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(10);
    expect(await prisma.ticketUnit.count({ where: { ticketTypeId, status: TicketUnitStatus.HELD } })).toBe(10);
    expect(await prisma.checkout.count({ where: { eventId, status: 'ACTIVE' } })).toBe(10);
  }, 30_000);

  it('reserva de vários tipos faz rollback completo quando um tipo não tem estoque', async () => {
    const freeUser = await prisma.user.findFirstOrThrow({ where: { id: { in: userIds }, checkouts: { none: { status: 'ACTIVE' } } } });
    const first = await prisma.ticketType.create({ data: { eventId, name: `Rollback A ${marker}`, priceCents: 500, capacity: 1, maxPerOrder: 2 } });
    const second = await prisma.ticketType.create({ data: { eventId, name: `Rollback B ${marker}`, priceCents: 500, capacity: 1, maxPerOrder: 2 } });
    await prisma.ticketUnit.createMany({ data: [{ ticketTypeId: first.id, sequence: 1 }, { ticketTypeId: second.id, sequence: 1 }] });
    const user: SessionUser = { id: freeUser.id, name: freeUser.name, email: freeUser.email, emailVerified: true, role: freeUser.role };

    await expect(service.create(user, randomUUID(), { eventId, items: [
      { ticketTypeId: first.id, quantity: 1 },
      { ticketTypeId: second.id, quantity: 2 }
    ] })).rejects.toMatchObject({ response: { code: 'STOCK_UNAVAILABLE' } });
    expect(await prisma.ticketUnit.count({ where: { ticketTypeId: first.id, status: TicketUnitStatus.AVAILABLE } })).toBe(1);
    expect(await prisma.checkout.count({ where: { userId: user.id, status: 'ACTIVE' } })).toBe(0);
  });

  it('a mesma chave idempotente devolve o mesmo checkout sem duplicar reserva', async () => {
    const freeUser = await prisma.user.findFirstOrThrow({ where: { id: { in: userIds }, checkouts: { none: { status: 'ACTIVE' } } } });
    const type = await prisma.ticketType.create({ data: { eventId, name: `Idempotência ${marker}`, priceCents: 700, capacity: 1, maxPerOrder: 1 } });
    await prisma.ticketUnit.create({ data: { ticketTypeId: type.id, sequence: 1 } });
    const user: SessionUser = { id: freeUser.id, name: freeUser.name, email: freeUser.email, emailVerified: true, role: freeUser.role };
    const key = randomUUID();
    const first = await service.create(user, key, { eventId, items: [{ ticketTypeId: type.id, quantity: 1 }] });
    const repeated = await service.create(user, key, { eventId, items: [{ ticketTypeId: type.id, quantity: 1 }] });
    expect(repeated.id).toBe(first.id);
    expect(await prisma.checkout.count({ where: { id: first.id } })).toBe(1);
    expect(await prisma.ticketUnit.count({ where: { ticketTypeId: type.id, status: TicketUnitStatus.HELD } })).toBe(1);

    await prisma.checkout.update({ where: { id: first.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });
    await expect(service.heartbeat(user.id, first.id)).rejects.toMatchObject({ status: 410 });
    expect((await prisma.checkout.findUniqueOrThrow({ where: { id: first.id } })).status).toBe('EXPIRED');
    expect(await prisma.ticketUnit.count({ where: { ticketTypeId: type.id, status: TicketUnitStatus.AVAILABLE } })).toBe(1);
  });

  it('ausência de heartbeat abandona e libera a unidade', async () => {
    const freeUser = await prisma.user.findFirstOrThrow({ where: { id: { in: userIds }, checkouts: { none: { status: 'ACTIVE' } } } });
    const type = await prisma.ticketType.create({ data: { eventId, name: `Presença ${marker}`, priceCents: 900, capacity: 1, maxPerOrder: 1 } });
    await prisma.ticketUnit.create({ data: { ticketTypeId: type.id, sequence: 1 } });
    const user: SessionUser = { id: freeUser.id, name: freeUser.name, email: freeUser.email, emailVerified: true, role: freeUser.role };
    const checkout = await service.create(user, randomUUID(), { eventId, items: [{ ticketTypeId: type.id, quantity: 1 }] });
    await prisma.checkout.update({ where: { id: checkout.id }, data: { lastHeartbeatAt: new Date(Date.now() - 61_000) } });
    await service.releaseStale();
    expect((await prisma.checkout.findUniqueOrThrow({ where: { id: checkout.id } })).status).toBe('ABANDONED');
    expect(await prisma.ticketUnit.count({ where: { ticketTypeId: type.id, status: TicketUnitStatus.AVAILABLE } })).toBe(1);
  });

  it('cancelamento simultâneo com validação nunca devolve uma unidade usada', async () => {
    const active = await prisma.checkout.findFirstOrThrow({ where: { eventId, status: 'ACTIVE' }, include: { user: true } });
    const owner: SessionUser = { id: active.user.id, name: active.user.name, email: active.user.email, emailVerified: true, role: active.user.role };
    const order = await service.confirm(owner, active.id, randomUUID());
    if (!order) throw new Error('A confirmação não criou o pedido de teste.');
    const issued = await prisma.issuedTicket.findFirstOrThrow({ where: { orderItem: { orderId: order.id } } });
    const gateUser = await prisma.user.findFirstOrThrow({ where: { id: { in: userIds }, NOT: { id: owner.id } } });
    await prisma.eventStaff.create({ data: { eventId, userId: gateUser.id } });
    const gate: SessionUser = { id: gateUser.id, name: gateUser.name, email: gateUser.email, emailVerified: true, role: 'customer,gate_staff' };
    const signed = createQrPayload(issued.publicId, process.env.QR_SIGNING_SECRET!);
    const outcomes = await Promise.allSettled([
      orders.validate(gate, signed),
      orders.cancelOrder(owner.id, order.id, randomUUID())
    ]);
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const finalTicket = await prisma.issuedTicket.findUniqueOrThrow({ where: { id: issued.id } });
    const finalUnit = await prisma.ticketUnit.findUniqueOrThrow({ where: { ticketTypeId_sequence: { ticketTypeId: issued.ticketTypeId, sequence: issued.unitSequence } } });
    if (finalTicket.status === 'USED') expect(finalUnit.status).toBe('SOLD');
    else {
      expect(finalTicket.status).toBe('CANCELLED');
      expect(finalUnit.status).toBe('AVAILABLE');
    }
  }, 20_000);

  it('prazo absoluto expira, libera a unidade e heartbeat não reativa o checkout', async () => {
    const freeUser = await prisma.user.findFirstOrThrow({ where: { id: { in: userIds }, checkouts: { none: { status: 'ACTIVE' } } } });
    const type = await prisma.ticketType.create({ data: { eventId, name: `Expiração ${marker}`, priceCents: 1100, capacity: 1, maxPerOrder: 1 } });
    await prisma.ticketUnit.create({ data: { ticketTypeId: type.id, sequence: 1 } });
    const user: SessionUser = { id: freeUser.id, name: freeUser.name, email: freeUser.email, emailVerified: true, role: freeUser.role };
    const checkout = await service.create(user, randomUUID(), { eventId, items: [{ ticketTypeId: type.id, quantity: 1 }] });
    await prisma.checkout.update({ where: { id: checkout.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });

    await service.releaseStale();
    await expect(service.heartbeat(user.id, checkout.id)).rejects.toMatchObject({ status: 410 });
    expect((await prisma.checkout.findUniqueOrThrow({ where: { id: checkout.id } })).status).toBe('EXPIRED');
    expect(await prisma.ticketUnit.count({ where: { ticketTypeId: type.id, status: TicketUnitStatus.AVAILABLE } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: checkout.id, action: 'CHECKOUT_EXPIRED' } })).toBe(1);
  });

  it('confirmação idempotente não duplica pedido nem ingresso', async () => {
    const freeUser = await prisma.user.findFirstOrThrow({ where: { id: { in: userIds }, checkouts: { none: { status: 'ACTIVE' } } } });
    const type = await prisma.ticketType.create({ data: { eventId, name: `Confirmação ${marker}`, priceCents: 1200, capacity: 1, maxPerOrder: 1 } });
    await prisma.ticketUnit.create({ data: { ticketTypeId: type.id, sequence: 1 } });
    const user: SessionUser = { id: freeUser.id, name: freeUser.name, email: freeUser.email, emailVerified: true, role: freeUser.role };
    const checkout = await service.create(user, randomUUID(), { eventId, items: [{ ticketTypeId: type.id, quantity: 1 }] });
    const key = randomUUID();
    const first = await service.confirm(user, checkout.id, key);
    const repeated = await service.confirm(user, checkout.id, key);

    expect(repeated?.id).toBe(first?.id);
    expect(await prisma.order.count({ where: { checkoutId: checkout.id } })).toBe(1);
    expect(await prisma.issuedTicket.count({ where: { orderItem: { orderId: first!.id } } })).toBe(1);
  });

  it('convite de portaria duplicado é rejeitado, pode ser revogado e não expõe hashes', async () => {
    const actorUser = await prisma.user.findUniqueOrThrow({ where: { id: userIds[0] } });
    const actor: SessionUser = { id: actorUser.id, name: actorUser.name, email: actorUser.email, emailVerified: true, role: 'customer,organizer' };
    const email = `convite-${marker}@test.local`;
    const first = await invitations.inviteStaff(actor, eventId, email);

    await expect(invitations.inviteStaff(actor, eventId, email.toUpperCase())).rejects.toMatchObject({ response: { code: 'ACTIVE_INVITATION_EXISTS' } });
    const listed = await invitations.listStaff(actor, eventId);
    expect(listed.find((item) => item.id === first.id)).not.toHaveProperty('tokenHash');
    expect(listed.find((item) => item.id === first.id)).not.toHaveProperty('dedupKey');

    const revoked = await invitations.revokeStaff(actor, eventId, first.id);
    expect(revoked.status).toBe('REVOKED');
    const replacement = await invitations.inviteStaff(actor, eventId, email);
    expect(replacement.id).not.toBe(first.id);
  });

  it('ativa produtor de forma idempotente e exige conta apta', async () => {
    const activationUser: SessionUser = { id: activationUserId, name: 'Novo produtor', email: `produtor-${marker}@test.local`, emailVerified: true, role: 'customer' };
    const first = await organizer.activate(activationUser);
    const repeated = await organizer.activate(activationUser);

    expect(first.roles).toEqual(['customer', 'organizer']);
    expect(repeated.roles).toEqual(first.roles);
    expect(await prisma.auditLog.count({ where: { actorId: activationUserId, action: 'ORGANIZER_SELF_ACTIVATED' } })).toBe(1);

    await expect(organizer.activate({ id: unverifiedUserId, name: 'Não verificado', email: `nao-verificado-${marker}@test.local`, emailVerified: false, role: 'customer' }))
      .rejects.toMatchObject({ response: { code: 'EMAIL_NOT_VERIFIED' } });
    await expect(organizer.activate({ id: incompleteUserId, name: 'Perfil incompleto', email: `incompleto-${marker}@test.local`, emailVerified: true, role: 'customer' }))
      .rejects.toMatchObject({ response: { code: 'PROFILE_INCOMPLETE' } });
  });

  it('submete, rejeita, reenvia e aprova evento sem publicação direta', async () => {
    const producerRecord = await prisma.user.findUniqueOrThrow({ where: { id: activationUserId } });
    const producer: SessionUser = { id: producerRecord.id, name: producerRecord.name, email: producerRecord.email, emailVerified: true, role: producerRecord.role };
    const reviewerRecord = await prisma.user.findUniqueOrThrow({ where: { id: userIds[0] } });
    const reviewer: SessionUser = { id: reviewerRecord.id, name: reviewerRecord.name, email: reviewerRecord.email, emailVerified: true, role: 'admin' };
    const startsAt = new Date(Date.now() + 14 * 86_400_000);
    const created = await events.create(producer, {
      categoryId, title: 'Evento em análise', slug: `review-${marker}`, description: 'Evento completo criado para testar o fluxo de moderação.',
      venueName: 'Local de revisão', postalCode: '01001000', street: 'Rua Teste', number: '10', district: 'Centro', city: 'São Paulo', state: 'SP',
      startsAt: startsAt.toISOString(), endsAt: new Date(startsAt.getTime() + 3_600_000).toISOString(), timezone: 'America/Sao_Paulo'
    });
    reviewEventId = created.id;
    const ticketType = await events.createTicketType(producer, created.id, { name: 'Entrada', priceCents: 2500, capacity: 5, maxPerOrder: 2 });
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZL0sAAAAASUVORK5CYII=', 'base64');
    await events.addImage(producer, created.id, { buffer: png, mimetype: 'image/png', size: png.length } as Express.Multer.File, 'COVER');

    await expect(events.update({ ...producer, id: userIds[2]! }, created.id, { title: 'Invasão' })).rejects.toMatchObject({ status: 403 });
    const submitted = await events.submit(producer, created.id);
    expect(submitted.status).toBe('PENDING_REVIEW');
    await expect(events.bySlug(created.slug)).rejects.toMatchObject({ status: 404 });
    await expect(events.update(producer, created.id, { title: 'Alteração durante análise' })).rejects.toMatchObject({ response: { code: 'EVENT_NOT_EDITABLE' } });

    const rejected = await admin.reject(reviewer, created.id, 'A descrição precisa explicar melhor a programação.');
    expect(rejected).toMatchObject({ status: 'REJECTED', rejectionReason: expect.any(String) });
    const edited = await events.update(producer, created.id, { description: 'Evento atualizado com programação completa e informações suficientes para a nova análise.' });
    expect(edited).toMatchObject({ status: 'DRAFT', rejectionReason: null, reviewedAt: null });

    await events.submit(producer, created.id);
    const approved = await admin.approve(reviewer, created.id);
    expect(approved).toMatchObject({ status: 'PUBLISHED', reviewedById: reviewer.id, rejectionReason: null });
    expect((await events.bySlug(created.slug)).id).toBe(created.id);
    await expect(events.update(producer, created.id, { title: 'Alteração após publicação' })).rejects.toMatchObject({ response: { code: 'EVENT_NOT_EDITABLE' } });
    await expect(events.updateTicketType(producer, ticketType.id, { priceCents: 3000 })).rejects.toMatchObject({ response: { code: 'EVENT_NOT_EDITABLE' } });
    expect((await events.updateCapacity(producer, ticketType.id, { capacity: 6 }))?.capacity).toBe(6);
    await expect(admin.approve(reviewer, created.id)).rejects.toMatchObject({ response: { code: 'EVENT_NOT_PENDING_REVIEW' } });
    expect(await prisma.auditLog.count({ where: { entityId: created.id, action: { in: ['EVENT_SUBMITTED', 'EVENT_REJECTED', 'EVENT_APPROVED'] } } })).toBe(4);
  });

  it('admin consulta recursos globais e analytics retorna métricas completas', async () => {
    const events = await admin.events({ page: 1, pageSize: 20, status: 'PUBLISHED' });
    const ordersPage = await admin.orders({ page: 1, pageSize: 20, eventId });
    const ticketsPage = await admin.tickets({ page: 1, pageSize: 20, eventId });
    const usersPage = await admin.users({ page: 1, pageSize: 20, search: marker });
    const actorUser = await prisma.user.findUniqueOrThrow({ where: { id: userIds[0] } });
    const actor: SessionUser = { id: actorUser.id, name: actorUser.name, email: actorUser.email, emailVerified: true, role: 'admin' };
    const metrics = await analytics.get(actor, {}, true);

    expect(events.data.some((event) => event.id === eventId)).toBe(true);
    expect(ordersPage.data.length).toBeGreaterThan(0);
    expect(ticketsPage.data.length).toBeGreaterThan(0);
    expect(usersPage.data.length).toBeGreaterThan(0);
    expect(metrics.summary).toMatchObject({ totalEvents: expect.any(Number), totalOrders: expect.any(Number), issuedTickets: expect.any(Number), usedTickets: expect.any(Number), activeReservations: expect.any(Number) });
    expect(metrics.availability.some((event) => event.eventId === eventId)).toBe(true);
    expect(metrics.recentOrders.length).toBeGreaterThan(0);
  });
});
