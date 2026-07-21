import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProtected } from '../common/openapi.decorators.js';
import { CurrentUser } from '../common/session-user.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { OrdersService } from './orders.service.js';
import { TicketResponseDto } from './tickets.dto.js';

@ApiTags('Tickets')
@ApiProtected(404)
@Controller('api/v1/tickets')
export class TicketsController {
  constructor(private readonly service: OrdersService) {}

  @ApiOperation({ summary: 'Listar ingressos do cliente' })
  @ApiOkResponse({ type: TicketResponseDto, isArray: true })
  @Get()
  list(@CurrentUser() user: SessionUser) { return this.service.listTickets(user.id); }

  @ApiOperation({ summary: 'Consultar ingresso e QR' })
  @ApiOkResponse({ type: TicketResponseDto })
  @Get(':id')
  get(@CurrentUser() user: SessionUser, @Param('id') id: string) { return this.service.getTicket(user.id, id); }
}
