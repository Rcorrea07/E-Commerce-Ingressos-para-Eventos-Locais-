import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblems, ApiProtected } from '../common/openapi.decorators.js';
import { CurrentUser } from '../common/session-user.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { AdminEventsQueryDto, AdminOrdersQueryDto, AdminTicketsQueryDto, AdminUsersQueryDto, RejectEventDto } from './admin.dto.js';
import { AdminEventDetailsResponseDto, AdminEventsResponseDto, AdminOrdersResponseDto, AdminTicketsResponseDto, AdminUsersResponseDto } from './admin.response.js';
import { AdminService } from './admin.service.js';

@Roles('admin')
@ApiTags('Admin')
@ApiProtected(400)
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @ApiOperation({ summary: 'Listar eventos da plataforma' })
  @ApiOkResponse({ type: AdminEventsResponseDto })
  @Get('events')
  events(@Query() query: AdminEventsQueryDto) { return this.service.events(query); }

  @ApiOperation({ summary: 'Consultar evento para moderação' })
  @ApiOkResponse({ type: AdminEventDetailsResponseDto })
  @ApiProblems(404)
  @Get('events/:id')
  event(@Param('id') id: string) { return this.service.event(id); }

  @ApiOperation({ summary: 'Aprovar e publicar evento' })
  @ApiCreatedResponse({ type: AdminEventDetailsResponseDto })
  @ApiProblems(404, 409)
  @Post('events/:id/approve')
  approve(@CurrentUser() user: SessionUser, @Param('id') id: string) { return this.service.approve(user, id); }

  @ApiOperation({ summary: 'Rejeitar evento em análise' })
  @ApiCreatedResponse({ type: AdminEventDetailsResponseDto })
  @ApiProblems(404, 409)
  @Post('events/:id/reject')
  reject(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() input: RejectEventDto) { return this.service.reject(user, id, input.reason); }

  @ApiOperation({ summary: 'Listar pedidos da plataforma' })
  @ApiOkResponse({ type: AdminOrdersResponseDto })
  @Get('orders')
  orders(@Query() query: AdminOrdersQueryDto) { return this.service.orders(query); }

  @ApiOperation({ summary: 'Listar ingressos emitidos' })
  @ApiOkResponse({ type: AdminTicketsResponseDto })
  @Get('tickets')
  tickets(@Query() query: AdminTicketsQueryDto) { return this.service.tickets(query); }

  @ApiOperation({ summary: 'Listar usuários da plataforma' })
  @ApiOkResponse({ type: AdminUsersResponseDto })
  @Get('users')
  users(@Query() query: AdminUsersQueryDto) { return this.service.users(query); }
}
