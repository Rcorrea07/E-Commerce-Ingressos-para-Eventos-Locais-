import { Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProtected } from '../common/openapi.decorators.js';
import { CurrentUser } from '../common/session-user.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { OrganizerActivationResponseDto } from './organizer.response.js';
import { OrganizerService } from './organizer.service.js';

@ApiTags('Organizer')
@ApiProtected(404, 422)
@Controller('api/v1/organizer')
export class OrganizerController {
  constructor(private readonly service: OrganizerService) {}

  @ApiOperation({ summary: 'Ativar a Área do Produtor' })
  @ApiCreatedResponse({ type: OrganizerActivationResponseDto })
  @Post('activate')
  activate(@CurrentUser() user: SessionUser) { return this.service.activate(user); }
}
