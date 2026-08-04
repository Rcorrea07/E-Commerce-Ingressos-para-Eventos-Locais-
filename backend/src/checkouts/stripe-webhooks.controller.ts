import { BadRequestException, Controller, Headers, HttpCode, Inject, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiProblems } from '../common/openapi.decorators.js';
import { Public } from '../common/public.decorator.js';
import { PAYMENT_GATEWAY, type PaymentGateway } from '../payments/payment.gateway.js';
import { CheckoutsService } from './checkouts.service.js';
import { PaymentWebhookResponseDto } from './checkouts.dto.js';

@ApiTags('Payments')
@ApiProblems(400, 503)
@Public()
@Controller('api/v1/payments/stripe')
export class StripeWebhooksController {
  constructor(
    private readonly checkouts: CheckoutsService,
    @Inject(PAYMENT_GATEWAY) private readonly payment: PaymentGateway
  ) {}

  @ApiOperation({ summary: 'Receber eventos assinados da Stripe' })
  @ApiOkResponse({ type: PaymentWebhookResponseDto })
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() request: Request, @Headers('stripe-signature') signature?: string) {
    if (!this.payment.parseWebhook) throw new ServiceUnavailableException('Webhook Stripe não está habilitado.');
    if (!signature || !Buffer.isBuffer(request.body)) throw new BadRequestException('Payload ou assinatura Stripe ausente.');
    let event;
    try {
      event = this.payment.parseWebhook(request.body, signature);
    } catch {
      throw new BadRequestException('Evento Stripe inválido.');
    }
    if (event) await this.checkouts.handlePaymentWebhook(event);
    return { received: true as const };
  }
}
