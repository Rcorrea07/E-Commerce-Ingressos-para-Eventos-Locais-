import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiProtected } from '../common/openapi.decorators.js';
import { CurrentUser } from '../common/session-user.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { OrderResponseDto } from '../tickets/tickets.dto.js';
import { CheckoutResponseDto, CheckoutStatusResponseDto, CreateCheckoutDto, HeartbeatResponseDto } from './checkouts.dto.js';
import { CheckoutsService } from './checkouts.service.js';

@ApiTags('Checkouts')
@ApiProtected(400, 404, 409, 410, 422, 429)
@Controller('api/v1/checkouts')
export class CheckoutsController {
  constructor(private readonly service: CheckoutsService) {}

  @ApiOperation({ summary: 'Criar checkout e reservar ingressos' })
  @ApiCreatedResponse({ type: CheckoutResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  create(@CurrentUser() user: SessionUser, @Headers('idempotency-key') key: string, @Body() input: CreateCheckoutDto) { return this.service.create(user, key, input); }

  @ApiOperation({ summary: 'Consultar checkout ativo do cliente' })
  @ApiOkResponse({ type: CheckoutResponseDto, nullable: true })
  @Get('active')
  active(@CurrentUser() user: SessionUser) { return this.service.active(user.id); }

  @ApiOperation({ summary: 'Consultar detalhes do checkout' })
  @ApiOkResponse({ type: CheckoutResponseDto })
  @Get(':id')
  get(@CurrentUser() user: SessionUser, @Param('id') id: string) { return this.service.get(user.id, id); }

  @ApiOperation({ summary: 'Manter a presença no checkout' })
  @ApiOkResponse({ type: HeartbeatResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':id/heartbeat')
  @HttpCode(200)
  heartbeat(@CurrentUser() user: SessionUser, @Param('id') id: string) { return this.service.heartbeat(user.id, id); }

  @ApiOperation({ summary: 'Cancelar checkout e liberar reserva' })
  @ApiOkResponse({ type: CheckoutStatusResponseDto })
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: SessionUser, @Param('id') id: string) { return this.service.cancel(user.id, id); }

  @ApiOperation({ summary: 'Confirmar checkout e emitir ingressos' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':id/confirm')
  confirm(@CurrentUser() user: SessionUser, @Param('id') id: string, @Headers('idempotency-key') key: string) { return this.service.confirm(user, id, key); }
}
