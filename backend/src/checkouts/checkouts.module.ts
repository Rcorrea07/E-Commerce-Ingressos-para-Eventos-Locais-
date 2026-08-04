import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { CheckoutsController } from './checkouts.controller.js';
import { CheckoutsService } from './checkouts.service.js';
import { StripeWebhooksController } from './stripe-webhooks.controller.js';

@Module({ imports: [PaymentsModule], controllers: [CheckoutsController, StripeWebhooksController], providers: [CheckoutsService], exports: [CheckoutsService] })
export class CheckoutsModule {}
