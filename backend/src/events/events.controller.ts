import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/public.decorator.js';
import { EventQueryDto } from './events.dto.js';
import { EventsService } from './events.service.js';

@Public()
@ApiTags('Events')
@Controller('api/v1/events')
export class EventsController {
  constructor(private readonly service: EventsService) {}
  @ApiOperation({ summary: 'Listar e filtrar eventos publicados' })
  @Get() list(@Query() query: EventQueryDto) { return this.service.list(query); }
  @ApiOperation({ summary: 'Consultar disponibilidade do evento' })
  @Get(':id/availability') availability(@Param('id') id: string) { return this.service.availability(id); }
  @ApiOperation({ summary: 'Consultar evento pelo slug' })
  @Get(':slug') bySlug(@Param('slug') slug: string) { return this.service.bySlug(slug); }
}
