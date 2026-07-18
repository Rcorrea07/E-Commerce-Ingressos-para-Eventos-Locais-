import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/session-user.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { OrdersService } from './orders.service.js';

@ApiTags('Tickets')
@Controller('api/v1/tickets')
export class TicketsController {
  constructor(private readonly service: OrdersService) {}
  @ApiOperation({ summary: 'Listar ingressos do cliente' })
  @Get() list(@CurrentUser() user: SessionUser) { return this.service.listTickets(user.id); }
  @ApiOperation({ summary: 'Consultar ingresso e QR' })
  @Get(':id') get(@CurrentUser() user: SessionUser, @Param('id') id: string) { return this.service.getTicket(user.id, id); }
}
