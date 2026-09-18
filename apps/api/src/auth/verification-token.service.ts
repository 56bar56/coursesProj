import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateOpaqueToken, hashToken } from './token.util';
import { VerificationTokenType } from '../generated/prisma/enums';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class VerificationTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(userId: string, type: VerificationTokenType): Promise<string> {
    const raw = generateOpaqueToken();
    await this.prisma.verificationToken.create({
      data: {
        userId,
        type,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });
    return raw;
  }

  async consume(rawToken: string, type: VerificationTokenType): Promise<string> {
    const tokenHash = hashToken(rawToken);
    const existing = await this.prisma.verificationToken.findUnique({ where: { tokenHash } });

    if (!existing || existing.type !== type) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (existing.consumedAt) {
      throw new UnauthorizedException('Token already used');
    }
    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Token expired');
    }

    await this.prisma.verificationToken.update({
      where: { id: existing.id },
      data: { consumedAt: new Date() },
    });

    return existing.userId;
  }
}
