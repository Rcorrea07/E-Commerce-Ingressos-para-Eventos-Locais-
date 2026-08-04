import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { PAYMENT_GATEWAY, SimulatedPaymentGateway } from './payment.gateway.js';
import { StripeTestPaymentGateway } from './stripe-test.gateway.js';

@Module({
  providers: [{
    provide: PAYMENT_GATEWAY,
    inject: [ConfigService],
    useFactory: (config: ConfigService<Env, true>) => {
      if (config.get('PAYMENT_PROVIDER', { infer: true }) !== 'stripe_test') return new SimulatedPaymentGateway();
      return new StripeTestPaymentGateway(
        config.get('STRIPE_SECRET_KEY', { infer: true })!,
        config.get('STRIPE_PUBLISHABLE_KEY', { infer: true })!,
        config.get('STRIPE_WEBHOOK_SECRET', { infer: true })!
      );
    }
  }],
  exports: [PAYMENT_GATEWAY]
})
export class PaymentsModule {}
