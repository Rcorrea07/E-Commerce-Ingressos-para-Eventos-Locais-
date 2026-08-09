import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
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
const DAY_MS = 24 * 60 * 60 * 1000;

type TicketFixture = {
  name: string;
  description: string;
  priceCents: number;
  capacity: number;
  maxPerOrder: number;
};

type EventFixture = {
  categorySlug: string;
  title: string;
  slug: string;
  description: string;
  venueName: string;
  postalCode: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  startsInDays: number;
  startHour: number;
  durationHours: number;
  coverFile: string;
  galleryFiles?: string[];
  tickets: TicketFixture[];
};

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

function eventWindow(startsInDays: number, startHour: number, durationHours: number) {
  const startsAt = new Date(Date.now() + startsInDays * DAY_MS);
  // Fixtures use America/Sao_Paulo. UTC-3 has no daylight-saving transition in the current calendar.
  startsAt.setUTCHours(startHour + 3, 0, 0, 0);
  return { startsAt, endsAt: new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000) };
}

async function ensureTicketType(eventId: string, startsAt: Date, fixture: TicketFixture) {
  const existing = await prisma.ticketType.findFirst({ where: { eventId, name: fixture.name } });
  const saleStartsAt = new Date(Date.now() - 60_000);
  const saleEndsAt = new Date(startsAt.getTime() - 60 * 60 * 1000);
  const existingUnitCount = existing ? await prisma.ticketUnit.count({ where: { ticketTypeId: existing.id } }) : 0;
  const capacity = Math.max(fixture.capacity, existingUnitCount);

  const ticketType = existing
    ? await prisma.ticketType.update({
        where: { id: existing.id },
        data: {
          description: fixture.description,
          priceCents: fixture.priceCents,
          capacity,
          maxPerOrder: fixture.maxPerOrder,
          saleStartsAt,
          saleEndsAt,
          active: true
        }
      })
    : await prisma.ticketType.create({
        data: {
          eventId,
          name: fixture.name,
          description: fixture.description,
          priceCents: fixture.priceCents,
          capacity,
          maxPerOrder: fixture.maxPerOrder,
          saleStartsAt,
          saleEndsAt
        }
      });

  await prisma.ticketUnit.createMany({
    data: Array.from({ length: capacity }, (_, index) => ({ ticketTypeId: ticketType.id, sequence: index + 1 })),
    skipDuplicates: true
  });
  return ticketType;
}

const fixtures: EventFixture[] = [
  {
    categorySlug: 'esportes',
    title: 'Corrida Pulso 10K',
    slug: 'corrida-pulso-10k',
    description: 'Uma manhã para ocupar as ruas de Belo Horizonte com energia. Percurso de 10 km, pontos de hidratação, kit do atleta e celebração na chegada.',
    venueName: 'Praça da Liberdade',
    postalCode: '30140010',
    street: 'Praça da Liberdade',
    number: 's/n',
    district: 'Funcionários',
    city: 'Belo Horizonte',
    state: 'MG',
    startsInDays: 8,
    startHour: 7,
    durationHours: 4,
    coverFile: 'corrida-pulso-10k.webp',
    tickets: [
      { name: 'Kit 10K', description: 'Número de peito, chip, camiseta e medalha de participação.', priceCents: 7500, capacity: 500, maxPerOrder: 4 }
    ]
  },
  {
    categorySlug: 'musica',
    title: 'Aurora Beats Festival',
    slug: 'aurora-beats-festival',
    description: 'Uma noite de música eletrônica, instalações de luz e encontros no coração de São Paulo, com artistas independentes e experiências imersivas.',
    venueName: 'Memorial da América Latina',
    postalCode: '01156001',
    street: 'Avenida Mário de Andrade',
    number: '664',
    district: 'Barra Funda',
    city: 'São Paulo',
    state: 'SP',
    startsInDays: 12,
    startHour: 20,
    durationHours: 8,
    coverFile: 'aurora-beats.webp',
    tickets: [
      { name: 'Pista', description: 'Acesso a todas as pistas e instalações do festival.', priceCents: 12900, capacity: 300, maxPerOrder: 6 },
      { name: 'Meia-entrada', description: 'Ingresso individual sujeito à comprovação do benefício.', priceCents: 6450, capacity: 150, maxPerOrder: 2 }
    ]
  },
  {
    categorySlug: 'gastronomia',
    title: 'Sabores da Vila',
    slug: 'sabores-da-vila',
    description: 'Chefs locais, pequenos produtores e cozinhas autorais reunidos em uma praça arborizada, com degustações, oficinas e música ambiente.',
    venueName: 'Praça Cidade de Milão',
    postalCode: '04502000',
    street: 'Avenida República do Líbano',
    number: '111',
    district: 'Moema',
    city: 'São Paulo',
    state: 'SP',
    startsInDays: 18,
    startHour: 16,
    durationHours: 7,
    coverFile: 'sabores-da-vila.webp',
    tickets: [
      { name: 'Entrada', description: 'Acesso ao festival e às áreas de convivência.', priceCents: 3500, capacity: 250, maxPerOrder: 8 },
      { name: 'Passaporte Degustação', description: 'Entrada e cinco experiências de degustação selecionadas.', priceCents: 8900, capacity: 120, maxPerOrder: 4 }
    ]
  },
  {
    categorySlug: 'tecnologia',
    title: 'Campinas Tech & Produto 2026',
    slug: 'futuro-agora-summit',
    description: 'Um encontro de um dia para pessoas de produto, engenharia e design, com cases de empresas locais, oficinas práticas e espaço para networking.',
    venueName: 'Expo Dom Pedro',
    postalCode: '13087901',
    street: 'Avenida Guilherme Campos',
    number: '500',
    district: 'Jardim Santa Genebra',
    city: 'Campinas',
    state: 'SP',
    startsInDays: 24,
    startHour: 9,
    durationHours: 10,
    coverFile: 'campinas-tech-produto.webp',
    galleryFiles: ['campinas-tech-demo.webp', 'campinas-tech-networking.webp'],
    tickets: [
      { name: 'Standard', description: 'Acesso às palestras, sessões práticas e área de networking.', priceCents: 16900, capacity: 200, maxPerOrder: 5 },
      { name: 'Estudante', description: 'Acesso completo para estudantes mediante apresentação de comprovante válido.', priceCents: 7900, capacity: 80, maxPerOrder: 2 }
    ]
  },
  {
    categorySlug: 'musica',
    title: 'Noite Indie no Galpão',
    slug: 'noite-indie-no-galpao',
    description: 'Uma noite de música independente com quatro bandas, repertório autoral e um palco intimista no coração da Barra Funda.',
    venueName: 'Galpão Cultural Barra Funda',
    postalCode: '01153000',
    street: 'Rua Barra Funda',
    number: '651',
    district: 'Barra Funda',
    city: 'São Paulo',
    state: 'SP',
    startsInDays: 30,
    startHour: 19,
    durationHours: 5,
    coverFile: 'noite-indie-no-galpao.webp',
    tickets: [
      { name: 'Pista', description: 'Acesso à área de público em frente ao palco.', priceCents: 6500, capacity: 180, maxPerOrder: 6 },
      { name: 'Meia-entrada', description: 'Ingresso sujeito à comprovação do benefício.', priceCents: 3250, capacity: 90, maxPerOrder: 2 }
    ]
  },
  {
    categorySlug: 'teatro',
    title: 'Entre Luzes',
    slug: 'entre-luzes',
    description: 'Teatro, dança e música ao vivo se encontram em uma montagem contemporânea sobre memória, escolhas e os caminhos que aproximam pessoas.',
    venueName: 'Teatro Riachuelo',
    postalCode: '20021290',
    street: 'Rua do Passeio',
    number: '38',
    district: 'Centro',
    city: 'Rio de Janeiro',
    state: 'RJ',
    startsInDays: 34,
    startHour: 20,
    durationHours: 2,
    coverFile: 'entre-luzes.webp',
    tickets: [
      { name: 'Plateia', description: 'Assento na plateia central por ordem de chegada.', priceCents: 9500, capacity: 120, maxPerOrder: 6 },
      { name: 'Balcão', description: 'Assento no balcão superior por ordem de chegada.', priceCents: 6000, capacity: 80, maxPerOrder: 6 }
    ]
  },
  {
    categorySlug: 'arte-e-cultura',
    title: 'Luzes do Museu',
    slug: 'luzes-do-museu',
    description: 'Uma visita noturna por instalações de luz, esculturas reflexivas e paisagens sonoras criadas para transformar a percepção do espaço.',
    venueName: 'Museu Oscar Niemeyer',
    postalCode: '80530230',
    street: 'Rua Marechal Hermes',
    number: '999',
    district: 'Centro Cívico',
    city: 'Curitiba',
    state: 'PR',
    startsInDays: 42,
    startHour: 19,
    durationHours: 4,
    coverFile: 'luzes-do-museu.webp',
    tickets: [
      { name: 'Entrada', description: 'Acesso à exposição imersiva durante a sessão escolhida.', priceCents: 4800, capacity: 220, maxPerOrder: 6 },
      { name: 'Meia-entrada', description: 'Acesso à exposição mediante comprovação do benefício.', priceCents: 2400, capacity: 100, maxPerOrder: 2 }
    ]
  }
];

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
    const organizerCpf = '11144477735';
    await prisma.userProfile.upsert({
      where: { userId: organizer.id },
      create: {
        userId: organizer.id,
        phone: '11988888888',
        cpfEncrypted: encryptPii(organizerCpf, process.env.PII_ENCRYPTION_KEY!),
        cpfHash: cpfHash(organizerCpf, process.env.PII_HASH_KEY!),
        postalCode: '01001000',
        street: 'Praça da Sé',
        number: '200',
        district: 'Sé',
        city: 'São Paulo',
        state: 'SP'
      },
      update: {}
    });

    const categories = new Map<string, string>();
    for (const category of [
      { name: 'Música', slug: 'musica' },
      { name: 'Gastronomia', slug: 'gastronomia' },
      { name: 'Tecnologia', slug: 'tecnologia' },
      { name: 'Teatro', slug: 'teatro' },
      { name: 'Esportes', slug: 'esportes' },
      { name: 'Arte e Cultura', slug: 'arte-e-cultura' }
    ]) {
      const saved = await prisma.eventCategory.upsert({
        where: { slug: category.slug },
        create: category,
        update: { name: category.name, active: true }
      });
      categories.set(saved.slug, saved.id);
    }

    const seededEvents = new Map<string, { id: string; tickets: Map<string, { id: string }> }>();
    for (const fixture of fixtures) {
      const categoryId = categories.get(fixture.categorySlug);
      if (!categoryId) throw new Error(`Categoria ausente no seed: ${fixture.categorySlug}`);
      const { startsAt, endsAt } = eventWindow(fixture.startsInDays, fixture.startHour, fixture.durationHours);
      const event = await prisma.event.upsert({
        where: { slug: fixture.slug },
        create: {
          organizerId: organizer.id,
          categoryId,
          title: fixture.title,
          slug: fixture.slug,
          description: fixture.description,
          venueName: fixture.venueName,
          postalCode: fixture.postalCode,
          street: fixture.street,
          number: fixture.number,
          district: fixture.district,
          city: fixture.city,
          state: fixture.state,
          startsAt,
          endsAt,
          status: EventStatus.PUBLISHED,
          publishedAt: new Date()
        },
        update: {
          organizerId: organizer.id,
          categoryId,
          title: fixture.title,
          description: fixture.description,
          venueName: fixture.venueName,
          postalCode: fixture.postalCode,
          street: fixture.street,
          number: fixture.number,
          district: fixture.district,
          city: fixture.city,
          state: fixture.state,
          startsAt,
          endsAt,
          status: EventStatus.PUBLISHED,
          cancelledAt: null
        }
      });

      const coverKey = `events/${event.id}/seed-cover.webp`;
      const cover = await readFile(resolve(process.cwd(), 'prisma', 'seed-assets', 'events', fixture.coverFile));
      await storage.put(coverKey, cover, 'image/webp');
      const existingCover = await prisma.eventImage.findFirst({
        where: { eventId: event.id, kind: EventImageKind.COVER },
        orderBy: { position: 'asc' }
      });
      if (existingCover) {
        await prisma.eventImage.update({
          where: { id: existingCover.id },
          data: { objectKey: coverKey, mimeType: 'image/webp', size: cover.length, position: 0 }
        });
        if (existingCover.objectKey !== coverKey) {
          await storage.remove(existingCover.objectKey).catch(() => undefined);
        }
      } else {
        await prisma.eventImage.create({
          data: { eventId: event.id, objectKey: coverKey, mimeType: 'image/webp', size: cover.length, kind: EventImageKind.COVER, position: 0 }
        });
      }

      for (const [index, galleryFile] of (fixture.galleryFiles ?? []).entries()) {
        const position = index + 1;
        const galleryKey = `events/${event.id}/seed-gallery-${position}.webp`;
        const gallery = await readFile(resolve(process.cwd(), 'prisma', 'seed-assets', 'events', galleryFile));
        await storage.put(galleryKey, gallery, 'image/webp');
        const existingGallery = await prisma.eventImage.findUnique({ where: { objectKey: galleryKey } });
        if (existingGallery) {
          await prisma.eventImage.update({
            where: { id: existingGallery.id },
            data: { mimeType: 'image/webp', size: gallery.length, kind: EventImageKind.GALLERY, position }
          });
        } else {
          const occupiedPosition = await prisma.eventImage.findFirst({ where: { eventId: event.id, kind: EventImageKind.GALLERY, position } });
          if (!occupiedPosition) {
            await prisma.eventImage.create({
              data: { eventId: event.id, objectKey: galleryKey, mimeType: 'image/webp', size: gallery.length, kind: EventImageKind.GALLERY, position }
            });
          }
        }
      }

      const tickets = new Map<string, { id: string }>();
      for (const ticketFixture of fixture.tickets) {
        const ticket = await ensureTicketType(event.id, startsAt, ticketFixture);
        tickets.set(ticket.name, ticket);
      }
      seededEvents.set(fixture.slug, { id: event.id, tickets });
      await prisma.eventStaff.upsert({
        where: { eventId_userId: { eventId: event.id, userId: gate.id } },
        create: { eventId: event.id, userId: gate.id },
        update: {}
      });
    }

    const legacyDemo = await prisma.event.findUnique({ where: { slug: 'festival-local-demo' }, select: { id: true, status: true } });
    if (legacyDemo && legacyDemo.status !== EventStatus.CANCELLED) {
      await prisma.event.update({ where: { id: legacyDemo.id }, data: { status: EventStatus.CANCELLED, cancelledAt: new Date() } });
    }

    const featuredEvent = seededEvents.get('noite-indie-no-galpao');
    const full = featuredEvent?.tickets.get('Pista');
    if (!featuredEvent || !full) throw new Error('Evento principal do seed incompleto.');
    const existingOrder = await prisma.order.findFirst({ where: { userId: customer.id, eventId: featuredEvent.id } });
    if (!existingOrder) {
      const user = { id: customer.id, name: customer.name, email: customer.email, emailVerified: true, role: customer.role };
      const checkout = await checkouts.create(user, randomUUID(), { eventId: featuredEvent.id, items: [{ ticketTypeId: full.id, quantity: 1 }] });
      await checkouts.confirm(user, checkout.id, randomUUID());
    }
    console.info('Seed completo:', {
      admin: admin.email,
      organizer: organizer.email,
      gate: gate.email,
      customer: customer.email,
      events: fixtures.length,
      categories: categories.size
    });
  } else {
    console.info('Admin criado:', admin.email);
  }
} finally {
  await app.close();
}
