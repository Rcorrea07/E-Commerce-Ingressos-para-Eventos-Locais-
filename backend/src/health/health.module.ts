import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { MaintenanceService } from './maintenance.service.js';

@Module({ controllers: [HealthController], providers: [MaintenanceService] })
export class HealthModule {}
