import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeletedResponseDto } from '../common/openapi.dto.js';
import { ApiProtected } from '../common/openapi.decorators.js';
import { CurrentUser } from '../common/session-user.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { EventImageKind } from '../generated/prisma/client.js';
import { CreateEventDto, CreateTicketTypeDto, ReorderImagesDto, UpdateCapacityDto, UpdateEventDto, UpdateTicketTypeDto } from './events.dto.js';
import { EventImageResponseDto, EventImagesResponseDto, EventRecordResponseDto, EventStatusResponseDto, OrganizerEventResponseDto, TicketTypeResponseDto } from './events.response.js';
import { EventsService } from './events.service.js';

@Roles('organizer', 'admin')
@ApiTags('Organizer')
@ApiProtected(400, 404, 409, 413, 422)
@Controller('api/v1/organizer/events')
export class OrganizerEventsController {
  constructor(private readonly service: EventsService) {}

  @ApiOperation({ summary: 'Listar eventos do organizador' })
  @ApiOkResponse({ type: OrganizerEventResponseDto, isArray: true })
  @Get()
  list(@CurrentUser() user: SessionUser) { return this.service.organizerList(user); }

  @ApiOperation({ summary: 'Criar evento em rascunho' })
  @ApiCreatedResponse({ type: EventRecordResponseDto })
  @Post()
  create(@CurrentUser() user: SessionUser, @Body() input: CreateEventDto) { return this.service.create(user, input); }

  @ApiOperation({ summary: 'Atualizar evento do organizador' })
  @ApiOkResponse({ type: EventRecordResponseDto })
  @Patch(':id')
  update(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() input: UpdateEventDto) { return this.service.update(user, id, input); }

  @ApiOperation({ summary: 'Enviar evento para análise' })
  @ApiCreatedResponse({ type: EventRecordResponseDto })
  @Post(':id/submit')
  submit(@CurrentUser() user: SessionUser, @Param('id') id: string) { return this.service.submit(user, id); }

  @ApiOperation({ summary: 'Cancelar evento e encerrar vendas' })
  @ApiCreatedResponse({ type: EventStatusResponseDto })
  @Post(':id/cancel')
  cancel(@CurrentUser() user: SessionUser, @Param('id') id: string) { return this.service.cancel(user, id); }

  @ApiOperation({ summary: 'Criar tipo e unidades de ingresso' })
  @ApiCreatedResponse({ type: TicketTypeResponseDto })
  @Post(':id/ticket-types')
  createTicket(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() input: CreateTicketTypeDto) { return this.service.createTicketType(user, id, input); }

  @ApiOperation({ summary: 'Atualizar tipo de ingresso' })
  @ApiOkResponse({ type: TicketTypeResponseDto })
  @Patch(':eventId/ticket-types/:ticketTypeId')
  updateTicket(@CurrentUser() user: SessionUser, @Param('ticketTypeId') id: string, @Body() input: UpdateTicketTypeDto) { return this.service.updateTicketType(user, id, input); }

  @ApiOperation({ summary: 'Alterar capacidade do tipo de ingresso' })
  @ApiOkResponse({ type: TicketTypeResponseDto })
  @Patch(':eventId/ticket-types/:ticketTypeId/capacity')
  capacity(@CurrentUser() user: SessionUser, @Param('ticketTypeId') id: string, @Body() input: UpdateCapacityDto) { return this.service.updateCapacity(user, id, input); }

  @ApiOperation({ summary: 'Enviar capa do evento' })
  @ApiCreatedResponse({ type: EventImageResponseDto })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } })
  @Post(':id/images/cover')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  cover(@CurrentUser() user: SessionUser, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) { return this.service.addImage(user, id, file, EventImageKind.COVER); }

  @ApiOperation({ summary: 'Adicionar imagem à galeria' })
  @ApiCreatedResponse({ type: EventImageResponseDto })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } })
  @Post(':id/images/gallery')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  gallery(@CurrentUser() user: SessionUser, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) { return this.service.addImage(user, id, file, EventImageKind.GALLERY); }

  @ApiOperation({ summary: 'Reordenar imagens da galeria' })
  @ApiOkResponse({ type: EventImagesResponseDto })
  @Patch(':eventId/images/order')
  reorderImages(@CurrentUser() user: SessionUser, @Param('eventId') eventId: string, @Body() input: ReorderImagesDto) { return this.service.reorderImages(user, eventId, input.imageIds); }

  @ApiOperation({ summary: 'Remover imagem do evento' })
  @ApiOkResponse({ type: DeletedResponseDto })
  @Delete(':eventId/images/:imageId')
  removeImage(@CurrentUser() user: SessionUser, @Param('eventId') eventId: string, @Param('imageId') imageId: string) { return this.service.removeImage(user, eventId, imageId); }
}
