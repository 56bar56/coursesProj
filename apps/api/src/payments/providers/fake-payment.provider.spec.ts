import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { FakePaymentProvider } from './fake-payment.provider';

const SECRET = 'test-payments-webhook-secret-16+';

function sign(body: Buffer): string {
  return createHmac('sha256', SECRET).update(body).digest('hex');
}

describe('FakePaymentProvider', () => {
  function buildProvider() {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'PAYMENTS_FAKE_WEBHOOK_SECRET') return SECRET;
        if (key === 'FRONTEND_URL') return 'http://localhost:5173';
        throw new Error(`Unexpected config key in test: ${key}`);
      }),
    };
    return new FakePaymentProvider(config as any);
  }

  it('creates a checkout session pointing at the local fake checkout page', async () => {
    const provider = buildProvider();
    const result = await provider.createCheckoutSession({
      orderId: 'order-1',
      amountCents: 5000,
      currency: 'USD',
      successUrl: 'http://localhost:5173/orders',
      cancelUrl: 'http://localhost:5173/courses/x',
    });
    expect(result.checkoutUrl).toBe('http://localhost:5173/checkout/fake/order-1');
    expect(result.providerRef).toBe('fake_order-1');
  });

  it('accepts a correctly-signed webhook body', () => {
    const provider = buildProvider();
    const body = Buffer.from(JSON.stringify({ type: 'checkout.completed', orderId: 'order-1', providerRef: 'fake_order-1' }));
    const event = provider.verifyAndParseWebhook(body, sign(body));
    expect(event).toMatchObject({ type: 'checkout.completed', orderId: 'order-1' });
  });

  it('rejects a webhook body with a missing signature', () => {
    const provider = buildProvider();
    const body = Buffer.from(JSON.stringify({ type: 'checkout.completed', orderId: 'order-1', providerRef: 'x' }));
    expect(() => provider.verifyAndParseWebhook(body, undefined)).toThrow(UnauthorizedException);
  });

  it('rejects a tampered webhook body', () => {
    const provider = buildProvider();
    const body = Buffer.from(JSON.stringify({ type: 'checkout.completed', orderId: 'order-1', providerRef: 'x' }));
    const signature = sign(body);
    const tampered = Buffer.from(JSON.stringify({ type: 'checkout.completed', orderId: 'order-2', providerRef: 'x' }));
    expect(() => provider.verifyAndParseWebhook(tampered, signature)).toThrow(UnauthorizedException);
  });

  it('rejects a signature computed with a different secret', () => {
    const provider = buildProvider();
    const body = Buffer.from(JSON.stringify({ type: 'checkout.completed', orderId: 'order-1', providerRef: 'x' }));
    const wrongSignature = createHmac('sha256', 'someone-elses-secret').update(body).digest('hex');
    expect(() => provider.verifyAndParseWebhook(body, wrongSignature)).toThrow(UnauthorizedException);
  });
});
