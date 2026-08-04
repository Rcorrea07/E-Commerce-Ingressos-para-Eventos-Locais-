import Stripe from 'stripe';
import type { GatewayPaymentSession, GatewayPaymentStatus, GatewayWebhookEvent, PaymentGateway } from './payment.gateway.js';

export class StripeTestPaymentGateway implements PaymentGateway {
  readonly provider = 'STRIPE_TEST' as const;
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly publishableKey: string,
    private readonly webhookSecret: string
  ) {
    this.stripe = new Stripe(secretKey, { typescript: true });
  }

  async create(input: { checkoutId: string; userId: string; amountCents: number; currency: 'BRL' }): Promise<GatewayPaymentSession> {
    const intent = await this.stripe.paymentIntents.create({
      amount: input.amountCents,
      currency: input.currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: { checkoutId: input.checkoutId, userId: input.userId }
    }, { idempotencyKey: `checkout:${input.checkoutId}` });
    return this.session(intent);
  }

  async resume(reference: string): Promise<GatewayPaymentSession> {
    return this.session(await this.stripe.paymentIntents.retrieve(reference));
  }

  async authorize(input: { checkoutId: string; amountCents: number; currency: 'BRL'; reference?: string | null }) {
    if (!input.reference) return { provider: this.provider, approved: false, reference: '' };
    const intent = await this.stripe.paymentIntents.retrieve(input.reference);
    const matchesCheckout = intent.metadata.checkoutId === input.checkoutId;
    const matchesAmount = intent.amount === input.amountCents && intent.currency.toUpperCase() === input.currency;
    return { provider: this.provider, approved: !intent.livemode && matchesCheckout && matchesAmount && intent.status === 'succeeded', reference: intent.id };
  }

  async cancel(reference: string): Promise<void> {
    const intent = await this.stripe.paymentIntents.retrieve(reference);
    if (intent.livemode || intent.status === 'canceled') return;
    if (intent.status === 'succeeded') {
      await this.stripe.refunds.create({ payment_intent: intent.id }, { idempotencyKey: `checkout-refund:${intent.id}` });
      return;
    }
    await this.stripe.paymentIntents.cancel(intent.id);
  }

  parseWebhook(payload: Buffer, signature: string): GatewayWebhookEvent | null {
    const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    if (event.livemode) throw new Error('Eventos Stripe live não são aceitos neste ambiente.');
    const statuses: Partial<Record<Stripe.Event.Type, GatewayPaymentStatus>> = {
      'payment_intent.succeeded': 'SUCCEEDED',
      'payment_intent.processing': 'PROCESSING',
      'payment_intent.payment_failed': 'FAILED',
      'payment_intent.canceled': 'CANCELLED'
    };
    const status = statuses[event.type];
    if (!status) return null;
    const intent = event.data.object as Stripe.PaymentIntent;
    const checkoutId = intent.metadata.checkoutId;
    const userId = intent.metadata.userId;
    if (!checkoutId || !userId) throw new Error('PaymentIntent sem metadados de checkout.');
    return { checkoutId, userId, reference: intent.id, status };
  }

  private session(intent: Stripe.PaymentIntent): GatewayPaymentSession {
    if (intent.livemode) throw new Error('PaymentIntent live rejeitado pela integração de teste.');
    if (!intent.client_secret) throw new Error('PaymentIntent sem client secret.');
    return {
      provider: this.provider,
      reference: intent.id,
      status: this.status(intent.status),
      requiresAction: intent.status !== 'succeeded',
      clientSecret: intent.client_secret,
      publishableKey: this.publishableKey
    };
  }

  private status(status: Stripe.PaymentIntent.Status): GatewayPaymentStatus {
    if (status === 'succeeded') return 'SUCCEEDED';
    if (status === 'processing') return 'PROCESSING';
    if (status === 'canceled') return 'CANCELLED';
    return 'PENDING';
  }
}
