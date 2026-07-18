import { Module } from '@nestjs/common';
import { GateController } from './gate.controller.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { TicketsController } from './tickets.controller.js';

@Module({ controllers: [OrdersController, TicketsController, GateController], providers: [OrdersService] })
export class TicketsModule {}
