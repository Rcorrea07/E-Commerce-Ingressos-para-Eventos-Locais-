import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditAction, EventImageKind, EventStatus, OrderStatus, Prisma, TicketStatus, TicketUnitStatus } from '../generated/prisma/client.js';
import { AuditService } from '../common/audit.service.js';
import { ProblemException } from '../common/problem.exception.js';
import { hasRole, type SessionUser } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import type { CreateEventDto, CreateTicketTypeDto, EventQueryDto, UpdateCapacityDto, UpdateEventDto, UpdateTicketTypeDto } from './events.dto.js';

type EventWithDetails = Prisma.EventGetPayload<{ include: { category: true; images: true; ticketTypes: { include: { _count: { select: { units: true } } } } } }>;

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService, private readonly audit: AuditService) {}

  private assertOwner(event: { organizerId: string }, user: SessionUser): void {
    if (event.organizerId !== user.id && !hasRole(user, 'admin')) throw new ForbiddenException('Evento pertence a outro organizador.');
  }

  private assertContentEditable(event: { status: EventStatus }): void {
    if (event.status !== EventStatus.DRAFT && event.status !== EventStatus.REJECTED) {
      throw new ProblemException('EVENT_NOT_EDITABLE', 'O conteúdo do evento só pode ser alterado enquanto estiver em rascunho ou rejeitado.', 409);
    }
  }

  private reviewReset(status: EventStatus) {
    return status === EventStatus.REJECTED
      ? { status: EventStatus.DRAFT, submittedAt: null, reviewedAt: null, reviewedById: null, rejectionReason: null }
      : {};
  }

  private serialize(event: EventWithDetails) {
    const publicEvent = { ...event, submittedAt: undefined, reviewedAt: undefined, reviewedById: undefined, rejectionReason: undefined };
    const ticketTypes = event.ticketTypes.map((ticket) => ({
      id: ticket.id,
      name: ticket.name,
      description: ticket.description,
      priceCents: ticket.priceCents,
      currency: 'BRL',
      capacity: ticket.capacity,
      available: ticket._count.units,
      maxPerOrder: ticket.maxPerOrder,
      saleStartsAt: ticket.saleStartsAt,
      saleEndsAt: ticket.saleEndsAt,
      active: ticket.active
    }));
    return {
      ...publicEvent,
      images: event.images.sort((a, b) => a.position - b.position).map((image) => ({ ...image, url: this.storage.url(image.objectKey) })),
      ticketTypes,
      soldOut: ticketTypes.reduce((sum, ticket) => sum + ticket.available, 0) === 0
    };
  }

  async list(query: EventQueryDto) {
    const where: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
      endsAt: { gt: new Date() },
      ...(query.search ? { OR: [{ title: { contains: query.search } }, { description: { contains: query.search } }] } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.city ? { city: { contains: query.city } } : {}),
      ...(query.from || query.to ? { startsAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {})
    };
    const [total, events] = await this.prisma.$transaction([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        include: {
          category: true,
          images: true,
          ticketTypes: { where: { active: true }, include: { _count: { select: { units: { where: { status: TicketUnitStatus.AVAILABLE } } } } } }
        },
        orderBy: query.sort === 'newest' ? { createdAt: 'desc' } : { startsAt: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      })
    ]);
    let data = events.map((event) => this.serialize(event));
    if (query.availability) data = data.filter((event) => query.availability === 'sold_out' ? event.soldOut : !event.soldOut);
    return { data, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
  }

  async bySlug(slug: string) {
    const event = await this.prisma.event.findFirst({
      where: { slug, status: EventStatus.PUBLISHED },
      include: {
        category: true,
        images: true,
        ticketTypes: { where: { active: true }, include: { _count: { select: { units: { where: { status: TicketUnitStatus.AVAILABLE } } } } } }
      }
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    return this.serialize(event);
  }

  async availability(eventId: string) {
    const types = await this.prisma.ticketType.findMany({
      where: { eventId, active: true, event: { status: EventStatus.PUBLISHED } },
      select: { id: true, name: true, capacity: true, _count: { select: { units: { where: { status: TicketUnitStatus.AVAILABLE } } } } }
    });
    if (!types.length) throw new NotFoundException('Evento não encontrado ou sem ingressos.');
    return { serverTime: new Date(), data: types.map((type) => ({ id: type.id, name: type.name, capacity: type.capacity, available: type._count.units })) };
  }

  async organizerList(user: SessionUser) {
    return this.prisma.event.findMany({ where: hasRole(user, 'admin') ? {} : { organizerId: user.id }, include: { category: true, images: true, ticketTypes: true }, orderBy: { createdAt: 'desc' } });
  }

  create(user: SessionUser, input: CreateEventDto) {
    return this.prisma.event.create({ data: { ...input, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), organizerId: user.id } });
  }

  async update(user: SessionUser, eventId: string, input: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    this.assertOwner(event, user);
    this.assertContentEditable(event);
    return this.prisma.event.update({
      where: { id: eventId },
      data: { ...input, ...(input.startsAt ? { startsAt: new Date(input.startsAt) } : {}), ...(input.endsAt ? { endsAt: new Date(input.endsAt) } : {}), ...this.reviewReset(event.status) }
    });
  }

  async submit(user: SessionUser, eventId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM Event WHERE id = ${eventId} FOR UPDATE`);
      const event = await tx.event.findUnique({ where: { id: eventId }, include: { images: true, ticketTypes: true } });
      if (!event) throw new NotFoundException('Evento não encontrado.');
      this.assertOwner(event, user);
      if (event.status !== EventStatus.DRAFT && event.status !== EventStatus.REJECTED) {
        throw new ProblemException('EVENT_NOT_EDITABLE', 'Somente eventos em rascunho ou rejeitados podem ser enviados para análise.', 409);
      }
      if (event.startsAt <= new Date()) throw new UnprocessableEntityException('A data do evento deve estar no futuro.');
      if (event.endsAt <= event.startsAt) throw new UnprocessableEntityException('A data final deve ser posterior à data inicial.');
      if (!event.images.some((image) => image.kind === EventImageKind.COVER)) throw new UnprocessableEntityException('Adicione uma imagem de capa antes de enviar para análise.');
      if (!event.ticketTypes.some((type) => type.active && type.capacity > 0)) throw new UnprocessableEntityException('Adicione ao menos um tipo de ingresso ativo.');
      const updated = await tx.event.update({
        where: { id: eventId },
        data: { status: EventStatus.PENDING_REVIEW, submittedAt: new Date(), reviewedAt: null, reviewedById: null, rejectionReason: null, publishedAt: null }
      });
      await tx.auditLog.create({ data: { actorId: user.id, action: AuditAction.EVENT_SUBMITTED, entityType: 'Event', entityId: eventId } });
      return updated;
    });
  }

  async cancel(user: SessionUser, eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    this.assertOwner(event, user);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM Event WHERE id = ${eventId} FOR UPDATE`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM Checkout WHERE eventId = ${eventId} AND status = 'ACTIVE' ORDER BY id FOR UPDATE`);
      const active = await tx.checkout.findMany({ where: { eventId, status: 'ACTIVE' }, select: { id: true } });
      const ids = active.map((item) => item.id);
      if (ids.length) {
        await tx.ticketUnit.updateMany({ where: { checkoutId: { in: ids }, status: TicketUnitStatus.HELD }, data: { status: TicketUnitStatus.AVAILABLE, checkoutId: null } });
        await tx.checkout.updateMany({ where: { id: { in: ids } }, data: { status: 'CANCELLED', terminalReason: 'EVENT_CANCELLED' } });
      }
      await tx.$queryRaw(Prisma.sql`SELECT id FROM \`Order\` WHERE eventId = ${eventId} AND status = 'CONFIRMED' ORDER BY id FOR UPDATE`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM IssuedTicket WHERE eventId = ${eventId} AND status IN ('ISSUED', 'USED') ORDER BY id FOR UPDATE`);
      await tx.event.update({ where: { id: eventId }, data: { status: EventStatus.CANCELLED, cancelledAt: new Date() } });
      await tx.order.updateMany({ where: { eventId, status: OrderStatus.CONFIRMED }, data: { status: OrderStatus.CANCELLED_BY_EVENT, cancelledAt: new Date() } });
      await tx.issuedTicket.updateMany({ where: { eventId, status: { in: [TicketStatus.ISSUED, TicketStatus.USED] } }, data: { status: TicketStatus.CANCELLED } });
    });
    await this.audit.write({ actorId: user.id, action: AuditAction.EVENT_CANCELLED, entityType: 'Event', entityId: eventId });
    return { id: eventId, status: EventStatus.CANCELLED };
  }

  async createTicketType(user: SessionUser, eventId: string, input: CreateTicketTypeDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    this.assertOwner(event, user);
    this.assertContentEditable(event);
    return this.prisma.$transaction(async (tx) => {
      if (event.status === EventStatus.REJECTED) await tx.event.update({ where: { id: eventId }, data: this.reviewReset(event.status) });
      const type = await tx.ticketType.create({ data: { ...input, eventId, saleStartsAt: input.saleStartsAt ? new Date(input.saleStartsAt) : null, saleEndsAt: input.saleEndsAt ? new Date(input.saleEndsAt) : null } });
      await tx.ticketUnit.createMany({ data: Array.from({ length: input.capacity }, (_, index) => ({ ticketTypeId: type.id, sequence: index + 1 })) });
      return type;
    });
  }

  async updateTicketType(user: SessionUser, ticketTypeId: string, input: UpdateTicketTypeDto) {
    const type = await this.prisma.ticketType.findUnique({ where: { id: ticketTypeId }, include: { event: true } });
    if (!type) throw new NotFoundException('Tipo de ingresso não encontrado.');
    this.assertOwner(type.event, user);
    this.assertContentEditable(type.event);
    return this.prisma.$transaction(async (tx) => {
      if (type.event.status === EventStatus.REJECTED) await tx.event.update({ where: { id: type.eventId }, data: this.reviewReset(type.event.status) });
      return tx.ticketType.update({ where: { id: ticketTypeId }, data: { ...input, ...(input.saleStartsAt !== undefined ? { saleStartsAt: input.saleStartsAt ? new Date(input.saleStartsAt) : null } : {}), ...(input.saleEndsAt !== undefined ? { saleEndsAt: input.saleEndsAt ? new Date(input.saleEndsAt) : null } : {}) } });
    });
  }

  async updateCapacity(user: SessionUser, ticketTypeId: string, input: UpdateCapacityDto) {
    const type = await this.prisma.ticketType.findUnique({ where: { id: ticketTypeId }, include: { event: true } });
    if (!type) throw new NotFoundException('Tipo de ingresso não encontrado.');
    this.assertOwner(type.event, user);
    if (type.event.status !== EventStatus.DRAFT && type.event.status !== EventStatus.REJECTED && type.event.status !== EventStatus.PUBLISHED) {
      throw new ProblemException('EVENT_NOT_EDITABLE', 'A capacidade não pode ser alterada no estado atual do evento.', 409);
    }
    await this.prisma.$transaction(async (tx) => {
      const unavailable = await tx.ticketUnit.count({ where: { ticketTypeId, status: { not: TicketUnitStatus.AVAILABLE } } });
      if (input.capacity < unavailable) throw new ConflictException(`A capacidade não pode ser menor que ${unavailable} unidades reservadas ou vendidas.`);
      if (input.capacity > type.capacity) {
        const highest = await tx.ticketUnit.findFirst({ where: { ticketTypeId }, orderBy: { sequence: 'desc' } });
        const start = (highest?.sequence ?? 0) + 1;
        await tx.ticketUnit.createMany({ data: Array.from({ length: input.capacity - type.capacity }, (_, index) => ({ ticketTypeId, sequence: start + index })) });
      } else if (input.capacity < type.capacity) {
        const remove = await tx.ticketUnit.findMany({ where: { ticketTypeId, status: TicketUnitStatus.AVAILABLE }, orderBy: { sequence: 'desc' }, take: type.capacity - input.capacity, select: { sequence: true } });
        if (remove.length !== type.capacity - input.capacity) throw new ConflictException('Não existem unidades livres suficientes para reduzir a capacidade.');
        await tx.ticketUnit.deleteMany({ where: { ticketTypeId, sequence: { in: remove.map((unit) => unit.sequence) }, status: TicketUnitStatus.AVAILABLE } });
      }
      await tx.ticketType.update({ where: { id: ticketTypeId }, data: { capacity: input.capacity } });
      if (type.event.status === EventStatus.REJECTED) await tx.event.update({ where: { id: type.eventId }, data: this.reviewReset(type.event.status) });
    }, { isolationLevel: 'ReadCommitted' });
    await this.audit.write({ actorId: user.id, action: AuditAction.CAPACITY_CHANGED, entityType: 'TicketType', entityId: ticketTypeId, metadata: { capacity: input.capacity } });
    return this.prisma.ticketType.findUniqueOrThrow({ where: { id: ticketTypeId } });
  }

  async addImage(user: SessionUser, eventId: string, file: Express.Multer.File, kind: EventImageKind) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, include: { images: true } });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    this.assertOwner(event, user);
    this.assertContentEditable(event);
    if (kind === EventImageKind.COVER && event.images.some((image) => image.kind === EventImageKind.COVER)) throw new ConflictException('O evento já possui uma capa.');
    const galleries = event.images.filter((image) => image.kind === EventImageKind.GALLERY);
    if (kind === EventImageKind.GALLERY && galleries.length >= 6) throw new ConflictException('A galeria já possui seis imagens.');
    if (!file?.buffer) throw new UnprocessableEntityException('Envie a imagem no campo file.');
    const mime = detectImage(file.buffer);
    if (!mime || mime !== file.mimetype) throw new UnprocessableEntityException('Arquivo de imagem inválido.');
    const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
    const objectKey = `events/${eventId}/${randomUUID()}.${extension}`;
    await this.storage.put(objectKey, file.buffer, mime);
    const position = kind === EventImageKind.COVER ? 0 : Math.max(0, ...event.images.map((image) => image.position)) + 1;
    try {
      const image = await this.prisma.$transaction(async (tx) => {
        if (event.status === EventStatus.REJECTED) await tx.event.update({ where: { id: eventId }, data: this.reviewReset(event.status) });
        return tx.eventImage.create({ data: { eventId, objectKey, mimeType: mime, size: file.size, kind, position } });
      });
      return { ...image, url: this.storage.url(objectKey) };
    } catch (error) {
      await this.storage.remove(objectKey).catch(() => undefined);
      throw error;
    }
  }

  async reorderImages(user: SessionUser, eventId: string, imageIds: string[]) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, include: { images: true } });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    this.assertOwner(event, user);
    this.assertContentEditable(event);
    const gallery = event.images.filter((image) => image.kind === EventImageKind.GALLERY);
    if (gallery.length !== imageIds.length || gallery.some((image) => !imageIds.includes(image.id))) {
      throw new UnprocessableEntityException('Informe todas as imagens da galeria exatamente uma vez.');
    }
    await this.prisma.$transaction(async (tx) => {
      if (event.status === EventStatus.REJECTED) await tx.event.update({ where: { id: eventId }, data: this.reviewReset(event.status) });
      for (let index = 0; index < imageIds.length; index += 1) {
        await tx.eventImage.update({ where: { id: imageIds[index]! }, data: { position: -(index + 1) } });
      }
      for (let index = 0; index < imageIds.length; index += 1) {
        await tx.eventImage.update({ where: { id: imageIds[index]! }, data: { position: index + 1 } });
      }
    });
    return this.prisma.eventImage.findMany({ where: { eventId, kind: EventImageKind.GALLERY }, orderBy: { position: 'asc' } });
  }

  async removeImage(user: SessionUser, eventId: string, imageId: string) {
    const image = await this.prisma.eventImage.findUnique({ where: { id: imageId }, include: { event: true } });
    if (!image || image.eventId !== eventId) throw new NotFoundException('Imagem não encontrada.');
    this.assertOwner(image.event, user);
    this.assertContentEditable(image.event);
    await this.prisma.$transaction(async (tx) => {
      if (image.event.status === EventStatus.REJECTED) await tx.event.update({ where: { id: eventId }, data: this.reviewReset(image.event.status) });
      await tx.eventImage.delete({ where: { id: imageId } });
    });
    await this.storage.remove(image.objectKey).catch(async (error: unknown) => {
      await this.prisma.mediaDeletion.upsert({ where: { objectKey: image.objectKey }, create: { objectKey: image.objectKey, lastError: String(error) }, update: { lastError: String(error), attempts: { increment: 1 } } });
    });
    return { deleted: true };
  }
}

function detectImage(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}
