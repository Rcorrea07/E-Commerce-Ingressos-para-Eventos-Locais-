import { Module } from '@nestjs/common';
import { PAYMENT_GATEWAY, SimulatedPaymentGateway } from './payment.gateway.js';

@Module({ providers: [{ provide: PAYMENT_GATEWAY, useClass: SimulatedPaymentGateway }], exports: [PAYMENT_GATEWAY] })
export class PaymentsModule {}
