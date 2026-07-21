import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProblems } from '../common/openapi.decorators.js';
import { Public } from '../common/public.decorator.js';
import { PrismaService } from '../database/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { LiveHealthResponseDto, ReadyHealthResponseDto } from './health.dto.js';

@Public()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  @ApiOperation({ summary: 'Verificar se a API está em execução' })
  @ApiOkResponse({ type: LiveHealthResponseDto })
  @Get('live')
  live() { return { status: 'ok', timestamp: new Date() }; }

  @ApiOperation({ summary: 'Verificar MySQL e MinIO' })
  @ApiOkResponse({ type: ReadyHealthResponseDto })
  @ApiProblems(503)
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const minio = await this.storage.ready();
      if (!minio) throw new Error('bucket missing');
      return { status: 'ready', checks: { mysql: 'up', minio: 'up' }, timestamp: new Date() };
    } catch {
      throw new ServiceUnavailableException('Dependências indisponíveis.');
    }
  }
}
