import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProtected } from '../common/openapi.decorators.js';
import { CurrentUser } from '../common/session-user.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { AnalyticsQueryDto, AnalyticsResponseDto } from './analytics.dto.js';
import { AnalyticsService } from './analytics.service.js';

@ApiTags('Analytics')
@ApiProtected(400)
@Controller('api/v1')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @ApiOperation({ summary: 'Consultar métricas dos próprios eventos' })
  @ApiOkResponse({ type: AnalyticsResponseDto })
  @Roles('organizer', 'admin')
  @Get('organizer/analytics')
  organizer(@CurrentUser() user: SessionUser, @Query() query: AnalyticsQueryDto) { return this.service.get(user, query); }

  @ApiOperation({ summary: 'Consultar métricas globais da plataforma' })
  @ApiOkResponse({ type: AnalyticsResponseDto })
  @Roles('admin')
  @Get('admin/analytics')
  admin(@CurrentUser() user: SessionUser, @Query() query: AnalyticsQueryDto) { return this.service.get(user, query, true); }
}
