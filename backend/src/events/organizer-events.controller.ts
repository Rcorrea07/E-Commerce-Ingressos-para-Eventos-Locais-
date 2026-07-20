import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventImageKind } from '../generated/prisma/client.js';
import { CurrentUser } from '../common/session-user.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { CreateEventDto, CreateTicketTypeDto, ReorderImagesDto, UpdateCapacityDto, UpdateEventDto, UpdateTicketTypeDto } from './events.dto.js';
import { EventsService } from './events.service.js';

@Roles('organizer', 'admin')
@ApiTags('Organizer')
@Controller('api/v1/organizer/events')
export class OrganizerEventsController {
  constructor(private readonly service: EventsService) {}
  @ApiOperation({ summary: 'Listar eventos do organizador' })
  @Get() list(@CurrentUser() user: SessionUser) { return this.service.organizerList(user); }
  @ApiOperation({ summary: 'Criar evento em rascunho' })
  @Post() create(@CurrentUser() user: SessionUser, @Body() input: CreateEventDto) { return this.service.create(user, input); }
  @ApiOperation({ summary: 'Atualizar evento do organizador' })
  @Patch(':id') update(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() input: UpdateEventDto) { return this.service.update(user, id, input); }
  @ApiOperation({ summary: 'Publicar evento' })
  @Post(':id/publish') publish(@CurrentUser() user: SessionUser, @Param('id') id: string) { return this.service.publish(user, id); }
  @ApiOperation({ summary: 'Cancelar evento e encerrar vendas' })
  @Post(':id/cancel') cancel(@CurrentUser() user: SessionUser, @Param('id') id: string) { return this.service.cancel(user, id); }
  @ApiOperation({ summary: 'Criar tipo e unidades de ingresso' })
  @Post(':id/ticket-types') createTicket(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() input: CreateTicketTypeDto) { return this.service.createTicketType(user, id, input); }
  @ApiOperation({ summary: 'Atualizar tipo de ingresso' })
  @Patch(':eventId/ticket-types/:ticketTypeId') updateTicket(@CurrentUser() user: SessionUser, @Param('ticketTypeId') id: string, @Body() input: UpdateTicketTypeDto) { return this.service.updateTicketType(user, id, input); }
  @ApiOperation({ summary: 'Alterar capacidade do tipo de ingresso' })
  @Patch(':eventId/ticket-types/:ticketTypeId/capacity') capacity(@CurrentUser() user: SessionUser, @Param('ticketTypeId') id: string, @Body() input: UpdateCapacityDto) { return this.service.updateCapacity(user, id, input); }
  @ApiOperation({ summary: 'Enviar capa do evento' })
  @Post(':id/images/cover')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  cover(@CurrentUser() user: SessionUser, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) { return this.service.addImage(user, id, file, EventImageKind.COVER); }
  @ApiOperation({ summary: 'Adicionar imagem à galeria' })
  @Post(':id/images/gallery')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  gallery(@CurrentUser() user: SessionUser, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) { return this.service.addImage(user, id, file, EventImageKind.GALLERY); }
  @ApiOperation({ summary: 'Reordenar imagens da galeria' })
  @Patch(':eventId/images/order')
  reorderImages(@CurrentUser() user: SessionUser, @Param('eventId') eventId: string, @Body() input: ReorderImagesDto) { return this.service.reorderImages(user, eventId, input.imageIds); }
  @ApiOperation({ summary: 'Remover imagem do evento' })
  @Delete(':eventId/images/:imageId') removeImage(@CurrentUser() user: SessionUser, @Param('eventId') eventId: string, @Param('imageId') imageId: string) { return this.service.removeImage(user, eventId, imageId); }
}
