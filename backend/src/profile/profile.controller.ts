import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProtected } from '../common/openapi.decorators.js';
import { CurrentUser } from '../common/session-user.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { ProfileResponseDto, UpdateProfileDto } from './profile.dto.js';
import { ProfileService } from './profile.service.js';

@ApiTags('Profile')
@ApiProtected(400, 404, 409)
@Controller('api/v1/profile')
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @ApiOperation({ summary: 'Consultar perfil do usuário' })
  @ApiOkResponse({ type: ProfileResponseDto })
  @Get()
  get(@CurrentUser() user: SessionUser) { return this.service.get(user.id); }

  @ApiOperation({ summary: 'Completar ou atualizar perfil' })
  @ApiOkResponse({ type: ProfileResponseDto })
  @Patch()
  update(@CurrentUser() user: SessionUser, @Body() input: UpdateProfileDto) { return this.service.update(user.id, input); }
}
