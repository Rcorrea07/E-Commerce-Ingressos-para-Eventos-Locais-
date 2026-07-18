import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CheckoutsService } from '../src/checkouts/checkouts.service.js';
import { AuditService } from '../src/common/audit.service.js';
import type { SessionUser } from '../src/common/request-context.js';
import type { Env } from '../src/config/env.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { EventStatus, TicketUnitStatus } from '../src/generated/prisma/client.js';
import { SimulatedPaymentGateway } from '../src/payments/payment.gateway.js';
import { encryptPii } from '../src/security/pii.js';
import { OrdersService } from '../src/tickets/orders.service.js';
import { createQrPayload } from '../src/tickets/qr.js';

const run = process.env.RUN_INTEGRATION === 'true';

describe.skipIf(!run)('reservas concorrentes no MySQL', () => {
  let prisma: PrismaService;
  let service: CheckoutsService;
  let orders: OrdersService;
  const marker = randomUUID();
  const userIds: string[] = [];
  let eventId: string;
  let categoryId: string;
  let ticketTypeId: string;

  beforeAll(async () => {
    const config = new ConfigService({
      DB_HOST: process.env.DB_HOST ?? 'localhost',
      DB_PORT: Number(process.env.DB_PORT ?? 3306),
      DB_USER: process.env.DB_USER ?? 'tickets',
      DB_PASSWORD: process.env.DB_PASSWORD ?? 'tickets',
      DB_NAME: process.env.DB_NAME ?? 'tickets',
      CHECKOUT_TTL_SECONDS: 900,
      CHECKOUT_PRESENCE_SECONDS: 60
    }) as ConfigService<Env, true>;
    prisma = new PrismaService(config);
    const audit = new AuditService(prisma);
    service = new CheckoutsService(prisma, config, audit, new SimulatedPaymentGateway());
    orders = new OrdersService(prisma, config, audit);

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
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await prisma.idempotencyRecord.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.ticketUnit.updateMany({ where: { ticketTypeId }, data: { status: TicketUnitStatus.AVAILABLE, checkoutId: null } });
    await prisma.issuedTicket.deleteMany({ where: { eventId } });
    await prisma.orderItem.deleteMany({ where: { order: { eventId } } });
    await prisma.order.deleteMany({ where: { eventId } });
    await prisma.checkoutItem.deleteMany({ where: { checkout: { eventId } } });
    await prisma.checkout.deleteMany({ where: { eventId } });
    await prisma.ticketUnit.deleteMany({ where: { ticketTypeId } });
    await prisma.ticketType.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
    await prisma.eventCategory.delete({ where: { id: categoryId } });
    await prisma.userProfile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
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
});
