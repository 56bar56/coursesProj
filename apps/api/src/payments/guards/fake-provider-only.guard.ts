import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';

/**
 * Gate for the dev-only "simulate payment outcome" endpoint. Requires two
 * independent env values to both be wrong before this could ever be
 * reachable in a real deployment.
 */
@Injectable()
export class FakeProviderOnlyGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(): boolean {
    const provider = this.config.get('PAYMENT_PROVIDER', { infer: true });
    const nodeEnv = this.config.get('NODE_ENV', { infer: true });

    if (provider !== 'fake' || nodeEnv === 'production') {
      throw new ForbiddenException('Fake payment simulation is not available');
    }

    return true;
  }
}
