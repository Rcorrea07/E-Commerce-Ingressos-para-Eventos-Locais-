import { Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/session-user.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { OrdersService } from './orders.service.js';

@ApiTags('Orders')
@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}
  @ApiOperation({ summary: 'Listar pedidos do cliente' })
  @Get() list(@CurrentUser() user: SessionUser) { return this.service.listOrders(user.id); }
  @ApiOperation({ summary: 'Consultar detalhes de um pedido' })
  @Get(':id') get(@CurrentUser() user: SessionUser, @Param('id') id: string) { return this.service.getOrder(user.id, id); }
  @ApiOperation({ summary: 'Cancelar pedido e devolver ingressos' })
  @Post(':id/cancel') cancel(@CurrentUser() user: SessionUser, @Param('id') id: string, @Headers('idempotency-key') key: string) { return this.service.cancelOrder(user.id, id, key); }
}
