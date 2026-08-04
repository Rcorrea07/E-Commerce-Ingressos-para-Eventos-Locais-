export type GatewayPaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export type GatewayProvider = 'SIMULATED' | 'STRIPE_TEST';

export interface GatewayPaymentSession {
  provider: GatewayProvider;
  reference: string;
  status: GatewayPaymentStatus;
  requiresAction: boolean;
  clientSecret?: string;
  publishableKey?: string;
}

export interface GatewayWebhookEvent {
  checkoutId: string;
  userId: string;
  reference: string;
  status: GatewayPaymentStatus;
}

export interface PaymentGateway {
  readonly provider: GatewayProvider;
  create(input: { checkoutId: string; userId: string; amountCents: number; currency: 'BRL' }): Promise<GatewayPaymentSession>;
  resume(reference: string): Promise<GatewayPaymentSession>;
  authorize(input: { checkoutId: string; amountCents: number; currency: 'BRL'; reference?: string | null }): Promise<{ provider: string; approved: boolean; reference: string }>;
  cancel(reference: string): Promise<void>;
  parseWebhook?(payload: Buffer, signature: string): GatewayWebhookEvent | null;
}

export const PAYMENT_GATEWAY = Symbol('PaymentGateway');

export class SimulatedPaymentGateway implements PaymentGateway {
  readonly provider = 'SIMULATED' as const;

  async create(input: { checkoutId: string }) {
    return { provider: this.provider, reference: `sim_${input.checkoutId}`, status: 'SUCCEEDED' as const, requiresAction: false };
  }

  async resume(reference: string) {
    return { provider: this.provider, reference, status: 'SUCCEEDED' as const, requiresAction: false };
  }

  async authorize(input: { checkoutId: string; reference?: string | null }) {
    return { provider: this.provider, approved: true, reference: input.reference ?? `sim_${input.checkoutId}` };
  }

  async cancel() {}
}
