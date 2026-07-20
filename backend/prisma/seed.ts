import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/auth/auth.service.js';
import { CheckoutsService } from '../src/checkouts/checkouts.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { EventImageKind, EventStatus } from '../src/generated/prisma/client.js';
import { encryptPii, cpfHash } from '../src/security/pii.js';
import { StorageService } from '../src/storage/storage.service.js';

const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
const prisma = app.get(PrismaService);
const auth = app.get(AuthService).auth;
const storage = app.get(StorageService);
const checkouts = app.get(CheckoutsService);

async function ensureUser(email: string, password: string, name: string, role: string) {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Better Auth's admin plugin only accepts its built-in roles at creation.
    // Domain roles are cumulative and are persisted immediately afterwards.
    await auth.api.createUser({ body: { email, password, name, role: role.includes('admin') ? 'admin' : 'user' } });
    user = await prisma.user.findUniqueOrThrow({ where: { email } });
  }
  return prisma.user.update({ where: { id: user.id }, data: { role, emailVerified: true, banned: false } });
}

try {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@ingressos.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!Local';
  const admin = await ensureUser(adminEmail, adminPassword, 'Administrador Local', 'admin');
  if (process.env.SEED_DEMO_DATA === 'true') {
    const organizer = await ensureUser('organizador@ingressos.local', 'Demo123!Local', 'Organizador Demo', 'customer,organizer');
    const gate = await ensureUser('portaria@ingressos.local', 'Demo123!Local', 'Portaria Demo', 'customer,gate_staff');
    const customer = await ensureUser('cliente@ingressos.local', 'Demo123!Local', 'Cliente Demo', 'customer');
    const cpf = '52998224725';
    await prisma.userProfile.upsert({
      where: { userId: customer.id },
      create: {
        userId: customer.id,
        phone: '11999999999',
        cpfEncrypted: encryptPii(cpf, process.env.PII_ENCRYPTION_KEY!),
        cpfHash: cpfHash(cpf, process.env.PII_HASH_KEY!),
        postalCode: '01001000',
        street: 'Praça da Sé',
        number: '100',
        district: 'Sé',
        city: 'São Paulo',
        state: 'SP'
      },
      update: {}
    });
    const category = await prisma.eventCategory.upsert({ where: { slug: 'musica' }, create: { name: 'Música', slug: 'musica' }, update: { active: true } });
    const startsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 4 * 60 * 60 * 1000);
    const event = await prisma.event.upsert({
      where: { slug: 'festival-local-demo' },
      create: {
        organizerId: organizer.id,
        categoryId: category.id,
        title: 'Festival Local Demo',
        slug: 'festival-local-demo',
        description: 'Evento de demonstração com música, ingressos individuais e validação por QR Code.',
        venueName: 'Centro Cultural Local',
        postalCode: '01001000',
        street: 'Praça da Sé',
        number: '100',
        district: 'Sé',
        city: 'São Paulo',
        state: 'SP',
        startsAt,
        endsAt,
        status: EventStatus.PUBLISHED,
        publishedAt: new Date()
      },
      update: { organizerId: organizer.id, categoryId: category.id, startsAt, endsAt, status: EventStatus.PUBLISHED }
    });
    const coverKey = `events/${event.id}/seed-cover.png`;
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZL0sAAAAASUVORK5CYII=', 'base64');
    await storage.put(coverKey, png, 'image/png');
    await prisma.eventImage.upsert({ where: { objectKey: coverKey }, create: { eventId: event.id, objectKey: coverKey, mimeType: 'image/png', size: png.length, kind: EventImageKind.COVER, position: 0 }, update: {} });
    let full = await prisma.ticketType.findFirst({ where: { eventId: event.id, name: 'Inteira' } });
    if (!full) {
      full = await prisma.ticketType.create({ data: { eventId: event.id, name: 'Inteira', priceCents: 8000, capacity: 100, maxPerOrder: 10, saleStartsAt: new Date(Date.now() - 60_000), saleEndsAt: new Date(startsAt.getTime() - 60_000) } });
      await prisma.ticketUnit.createMany({ data: Array.from({ length: 100 }, (_, index) => ({ ticketTypeId: full!.id, sequence: index + 1 })) });
    }
    let half = await prisma.ticketType.findFirst({ where: { eventId: event.id, name: 'Meia-entrada' } });
    if (!half) {
      half = await prisma.ticketType.create({ data: { eventId: event.id, name: 'Meia-entrada', priceCents: 4000, capacity: 50, maxPerOrder: 2, saleStartsAt: new Date(Date.now() - 60_000), saleEndsAt: new Date(startsAt.getTime() - 60_000) } });
      await prisma.ticketUnit.createMany({ data: Array.from({ length: 50 }, (_, index) => ({ ticketTypeId: half!.id, sequence: index + 1 })) });
    }
    await prisma.eventStaff.upsert({ where: { eventId_userId: { eventId: event.id, userId: gate.id } }, create: { eventId: event.id, userId: gate.id }, update: {} });
    const existingOrder = await prisma.order.findFirst({ where: { userId: customer.id, eventId: event.id } });
    if (!existingOrder) {
      const user = { id: customer.id, name: customer.name, email: customer.email, emailVerified: true, role: customer.role };
      const checkout = await checkouts.create(user, randomUUID(), { eventId: event.id, items: [{ ticketTypeId: full.id, quantity: 1 }] });
      await checkouts.confirm(user, checkout.id, randomUUID());
    }
    console.info('Seed completo:', { admin: admin.email, organizer: organizer.email, gate: gate.email, customer: customer.email });
  } else {
    console.info('Admin criado:', admin.email);
  }
} finally {
  await app.close();
}
