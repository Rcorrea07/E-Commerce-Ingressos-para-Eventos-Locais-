import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/session-user.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import type { SessionUser } from '../common/request-context.js';
import { AnalyticsQueryDto } from './analytics.dto.js';
import { AnalyticsService } from './analytics.service.js';

@ApiTags('Analytics')
@Controller('api/v1')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @ApiOperation({ summary: 'Consultar métricas dos próprios eventos' })
  @Roles('organizer', 'admin') @Get('organizer/analytics') organizer(@CurrentUser() user: SessionUser, @Query() query: AnalyticsQueryDto) { return this.service.get(user, query); }
  @ApiOperation({ summary: 'Consultar métricas globais da plataforma' })
  @Roles('admin') @Get('admin/analytics') admin(@CurrentUser() user: SessionUser, @Query() query: AnalyticsQueryDto) { return this.service.get(user, query, true); }
}
