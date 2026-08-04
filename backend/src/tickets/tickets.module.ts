import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { GateController } from './gate.controller.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { TicketsController } from './tickets.controller.js';

@Module({ imports: [PaymentsModule], controllers: [OrdersController, TicketsController, GateController], providers: [OrdersService] })
export class TicketsModule {}
