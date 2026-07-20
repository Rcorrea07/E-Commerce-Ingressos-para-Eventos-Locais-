import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/session-user.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { UpdateProfileDto } from './profile.dto.js';
import { ProfileService } from './profile.service.js';

@ApiTags('Profile')
@Controller('api/v1/profile')
export class ProfileController {
  constructor(private readonly service: ProfileService) {}
  @ApiOperation({ summary: 'Consultar perfil do usuário' })
  @Get() get(@CurrentUser() user: SessionUser) { return this.service.get(user.id); }
  @ApiOperation({ summary: 'Completar ou atualizar perfil' })
  @Patch() update(@CurrentUser() user: SessionUser, @Body() input: UpdateProfileDto) { return this.service.update(user.id, input); }
}
