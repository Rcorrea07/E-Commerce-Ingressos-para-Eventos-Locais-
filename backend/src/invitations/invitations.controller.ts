import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiProtected } from '../common/openapi.decorators.js';
import { CurrentUser } from '../common/session-user.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import {
  AcceptInvitationDto,
  AcceptStaffInvitationResponseDto,
  InviteDto,
  StaffInvitationResponseDto
} from './invitations.dto.js';
import { InvitationsService } from './invitations.service.js';

@ApiTags('Invitations')
@Controller('api/v1')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  @ApiOperation({ summary: 'Convidar membro da portaria' })
  @ApiCreatedResponse({ type: StaffInvitationResponseDto })
  @ApiProtected(400, 404, 409, 429)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Roles('organizer', 'admin')
  @Post('organizer/events/:eventId/staff-invitations')
  inviteStaff(@CurrentUser() user: SessionUser, @Param('eventId') eventId: string, @Body() input: InviteDto) { return this.service.inviteStaff(user, eventId, input.email); }

  @ApiOperation({ summary: 'Listar convites de portaria do evento' })
  @ApiOkResponse({ type: StaffInvitationResponseDto, isArray: true })
  @ApiProtected(404)
  @Roles('organizer', 'admin')
  @Get('organizer/events/:eventId/staff-invitations')
  listStaff(@CurrentUser() user: SessionUser, @Param('eventId') eventId: string) { return this.service.listStaff(user, eventId); }

  @ApiOperation({ summary: 'Revogar convite de portaria' })
  @ApiCreatedResponse({ type: StaffInvitationResponseDto })
  @ApiProtected(404, 409)
  @Roles('organizer', 'admin')
  @Post('organizer/events/:eventId/staff-invitations/:invitationId/revoke')
  revokeStaff(@CurrentUser() user: SessionUser, @Param('eventId') eventId: string, @Param('invitationId') invitationId: string) { return this.service.revokeStaff(user, eventId, invitationId); }

  @ApiOperation({ summary: 'Aceitar convite de portaria' })
  @ApiCreatedResponse({ type: AcceptStaffInvitationResponseDto })
  @ApiProtected(400, 404, 409)
  @Post('invitations/staff/accept')
  acceptStaff(@CurrentUser() user: SessionUser, @Body() input: AcceptInvitationDto) { return this.service.acceptStaff(user, input.token); }
}
