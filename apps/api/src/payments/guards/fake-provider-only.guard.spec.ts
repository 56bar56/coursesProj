import { ForbiddenException } from '@nestjs/common';
import { FakeProviderOnlyGuard } from './fake-provider-only.guard';

describe('FakeProviderOnlyGuard', () => {
  function buildGuard(provider: string, nodeEnv: string) {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'PAYMENT_PROVIDER') return provider;
        if (key === 'NODE_ENV') return nodeEnv;
        throw new Error(`Unexpected config key in test: ${key}`);
      }),
    };
    return new FakeProviderOnlyGuard(config as any);
  }

  it('allows the request when the provider is fake and the environment is not production', () => {
    const guard = buildGuard('fake', 'development');
    expect(guard.canActivate()).toBe(true);
  });

  it('rejects when the provider is not fake', () => {
    const guard = buildGuard('stripe', 'development');
    expect(() => guard.canActivate()).toThrow(ForbiddenException);
  });

  it('rejects when the environment is production, even if the provider is fake', () => {
    const guard = buildGuard('fake', 'production');
    expect(() => guard.canActivate()).toThrow(ForbiddenException);
  });

  it('rejects when both conditions are wrong', () => {
    const guard = buildGuard('stripe', 'production');
    expect(() => guard.canActivate()).toThrow(ForbiddenException);
  });
});
