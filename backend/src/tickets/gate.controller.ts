import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiProtected } from '../common/openapi.decorators.js';
import { CurrentUser } from '../common/session-user.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { OrdersService } from './orders.service.js';
import { GateEventResponseDto, GateValidationResponseDto, ValidateTicketDto } from './tickets.dto.js';

@Roles('gate_staff', 'organizer', 'admin')
@ApiTags('Gate')
@ApiProtected(400, 404, 409, 422, 429)
@Controller('api/v1/gate')
export class GateController {
  constructor(private readonly service: OrdersService) {}

  @ApiOperation({ summary: 'Listar eventos atribuídos à portaria' })
  @ApiOkResponse({ type: GateEventResponseDto, isArray: true })
  @Get('events')
  events(@CurrentUser() user: SessionUser) { return this.service.gateEvents(user); }

  @ApiOperation({ summary: 'Validar ingresso pelo QR' })
  @ApiCreatedResponse({ type: GateValidationResponseDto })
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('tickets/validate')
  validate(@CurrentUser() user: SessionUser, @Body() input: ValidateTicketDto) { return this.service.validate(user, input.qrPayload); }
}
