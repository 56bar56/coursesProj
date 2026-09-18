import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_COOKIE } from '../../auth/constants';
import type { Env } from '../../config/env.schema';
import type { AccessTokenPayload } from '../../auth/types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.[ACCESS_TOKEN_COOKIE];

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = jwt.verify(token, this.config.get('JWT_ACCESS_SECRET', { infer: true })) as AccessTokenPayload;
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
