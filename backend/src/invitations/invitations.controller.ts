import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/session-user.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { AcceptInvitationDto, InviteDto } from './invitations.dto.js';
import { InvitationsService } from './invitations.service.js';

@ApiTags('Invitations')
@Controller('api/v1')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}
  @ApiOperation({ summary: 'Convidar um organizador' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Roles('admin') @Post('admin/organizer-invitations') inviteOrganizer(@CurrentUser() user: SessionUser, @Body() input: InviteDto) { return this.service.inviteOrganizer(user, input.email); }
  @ApiOperation({ summary: 'Listar convites de organizador' })
  @Roles('admin') @Get('admin/organizer-invitations') listOrganizer() { return this.service.listOrganizerInvitations(); }
  @ApiOperation({ summary: 'Aceitar convite de organizador' })
  @Post('invitations/organizer/accept') acceptOrganizer(@CurrentUser() user: SessionUser, @Body() input: AcceptInvitationDto) { return this.service.acceptOrganizer(user, input.token); }
  @ApiOperation({ summary: 'Convidar membro da portaria' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Roles('organizer', 'admin') @Post('organizer/events/:eventId/staff-invitations') inviteStaff(@CurrentUser() user: SessionUser, @Param('eventId') eventId: string, @Body() input: InviteDto) { return this.service.inviteStaff(user, eventId, input.email); }
  @ApiOperation({ summary: 'Listar convites de portaria do evento' })
  @Roles('organizer', 'admin') @Get('organizer/events/:eventId/staff-invitations') listStaff(@CurrentUser() user: SessionUser, @Param('eventId') eventId: string) { return this.service.listStaff(user, eventId); }
  @ApiOperation({ summary: 'Aceitar convite de portaria' })
  @Post('invitations/staff/accept') acceptStaff(@CurrentUser() user: SessionUser, @Body() input: AcceptInvitationDto) { return this.service.acceptStaff(user, input.token); }
}
