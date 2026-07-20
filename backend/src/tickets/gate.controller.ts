import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/session-user.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { OrdersService } from './orders.service.js';
import { ValidateTicketDto } from './tickets.dto.js';

@Roles('gate_staff', 'organizer', 'admin')
@ApiTags('Gate')
@Controller('api/v1/gate')
export class GateController {
  constructor(private readonly service: OrdersService) {}
  @ApiOperation({ summary: 'Listar eventos atribuídos à portaria' })
  @Get('events') events(@CurrentUser() user: SessionUser) { return this.service.gateEvents(user); }
  @ApiOperation({ summary: 'Validar ingresso pelo QR' })
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('tickets/validate') validate(@CurrentUser() user: SessionUser, @Body() input: ValidateTicketDto) { return this.service.validate(user, input.qrPayload); }
}
