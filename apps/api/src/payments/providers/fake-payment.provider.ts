import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Env } from '../../config/env.schema';
import type {
  CheckoutSession,
  CreateCheckoutSessionParams,
  NormalizedPaymentEvent,
  PaymentProvider,
} from './payment-provider.interface';

/**
 * Simulates a hosted-checkout provider entirely within this app, since no
 * real Stripe account exists yet. `verifyAndParseWebhook` is implemented for
 * real (not stubbed) so the real /payments/webhook HTTP endpoint has
 * something genuine to verify against during manual testing — the app's own
 * "Simulate" button does not go through it, since there's no external
 * caller to authenticate for a same-process dev action.
 */
@Injectable()
export class FakePaymentProvider implements PaymentProvider {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    return {
      checkoutUrl: `${frontendUrl}/checkout/fake/${params.orderId}`,
      providerRef: `fake_${params.orderId}`,
    };
  }

  verifyAndParseWebhook(rawBody: Buffer, signatureHeader: string | undefined): NormalizedPaymentEvent {
    if (!signatureHeader) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const secret = this.config.get('PAYMENTS_FAKE_WEBHOOK_SECRET', { infer: true });
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    const provided = Buffer.from(signatureHeader);
    const expectedBuf = Buffer.from(expected);
    if (provided.length !== expectedBuf.length || !timingSafeEqual(provided, expectedBuf)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    try {
      return JSON.parse(rawBody.toString('utf-8')) as NormalizedPaymentEvent;
    } catch {
      throw new UnauthorizedException('Malformed webhook payload');
    }
  }
}
