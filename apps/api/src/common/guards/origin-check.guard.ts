import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';

/**
 * Baseline CSRF defense for cookie-authenticated state-changing requests:
 * rejects any request whose Origin header doesn't match the known frontend.
 * Browsers always send Origin on fetch/XHR, so this blocks cross-site
 * form/script submissions even though SameSite=Lax already covers most cases.
 */
@Injectable()
export class OriginCheckGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const origin = request.headers['origin'];

    if (!origin) {
      // Non-browser clients (server-to-server, curl) won't send Origin.
      // Cookies aren't attached to those requests anyway, so this is safe.
      return true;
    }

    const allowedOrigin = this.config.get('FRONTEND_URL', { infer: true });
    if (origin !== allowedOrigin) {
      throw new ForbiddenException('Cross-origin request rejected');
    }

    return true;
  }
}
