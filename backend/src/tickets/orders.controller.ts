import { Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProtected } from '../common/openapi.decorators.js';
import { CurrentUser } from '../common/session-user.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { OrdersService } from './orders.service.js';
import { OrderResponseDto } from './tickets.dto.js';

@ApiTags('Orders')
@ApiProtected(400, 404, 409)
@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @ApiOperation({ summary: 'Listar pedidos do cliente' })
  @ApiOkResponse({ type: OrderResponseDto, isArray: true })
  @Get()
  list(@CurrentUser() user: SessionUser) { return this.service.listOrders(user.id); }

  @ApiOperation({ summary: 'Consultar detalhes de um pedido' })
  @ApiOkResponse({ type: OrderResponseDto })
  @Get(':id')
  get(@CurrentUser() user: SessionUser, @Param('id') id: string) { return this.service.getOrder(user.id, id); }

  @ApiOperation({ summary: 'Cancelar pedido e devolver ingressos' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @Post(':id/cancel')
  cancel(@CurrentUser() user: SessionUser, @Param('id') id: string, @Headers('idempotency-key') key: string) { return this.service.cancelOrder(user.id, id, key); }
}
