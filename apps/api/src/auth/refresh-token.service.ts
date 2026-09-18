import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { generateOpaqueToken, hashToken } from './token.util';
import type { Env } from '../config/env.schema';

interface IssuedRefreshToken {
  raw: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private ttlMs(): number {
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    return days * 24 * 60 * 60 * 1000;
  }

  async issue(userId: string): Promise<IssuedRefreshToken> {
    const raw = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + this.ttlMs());

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw),
        expiresAt,
      },
    });

    return { raw, expiresAt };
  }

  /**
   * Validates and rotates a refresh token. Revokes the presented token and
   * issues a new one. If the presented token was already revoked, that's a
   * replay of a stolen token, so every refresh token for the user is revoked,
   * forcing a fresh login everywhere.
   */
  async rotate(rawToken: string): Promise<{ userId: string; token: IssuedRefreshToken }> {
    const tokenHash = hashToken(rawToken);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.revokedAt) {
      await this.revokeAllForUser(existing.userId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const token = await this.issue(existing.userId);
    return { userId: existing.userId, token };
  }

  async revoke(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
