export interface PaymentGateway {
  authorize(input: { checkoutId: string; amountCents: number; currency: 'BRL' }): Promise<{ provider: string; approved: boolean; reference: string }>;
}

export const PAYMENT_GATEWAY = Symbol('PaymentGateway');

export class SimulatedPaymentGateway implements PaymentGateway {
  async authorize(input: { checkoutId: string; amountCents: number; currency: 'BRL' }) {
    return { provider: 'SIMULATED', approved: true, reference: `sim_${input.checkoutId}` };
  }
}
