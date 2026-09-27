export interface CreateCheckoutSessionParams {
  orderId: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  checkoutUrl: string;
  providerRef: string;
}

export type PaymentEventType = 'checkout.completed' | 'checkout.failed';

export interface NormalizedPaymentEvent {
  type: PaymentEventType;
  orderId: string;
  providerRef: string;
  /** Unused by the fake provider; populate from Stripe's event.id once a real provider exists. */
  providerEventId?: string;
}

export interface PaymentProvider {
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession>;
  verifyAndParseWebhook(rawBody: Buffer, signatureHeader: string | undefined): NormalizedPaymentEvent;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
