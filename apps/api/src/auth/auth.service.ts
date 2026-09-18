import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import type { Env } from '../config/env.schema';
import { MailService } from '../mail/mail.service';
import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';
import { VerificationTokenService } from './verification-token.service';
import { VerificationTokenType, type Role } from '../generated/prisma/enums';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { AccessTokenPayload } from './types';

interface AuthResult {
  user: { id: string; email: string; displayName: string; roles: Role[] };
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly passwordService: PasswordService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly verificationTokenService: VerificationTokenService,
    private readonly mailService: MailService,
  ) {}

  private signAccessToken(user: { id: string; email: string; roles: Role[] }): string {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email, roles: user.roles };
    const secret = this.config.get('JWT_ACCESS_SECRET', { infer: true });
    const ttlMin = this.config.get('ACCESS_TOKEN_TTL_MIN', { infer: true });
    return jwt.sign(payload, secret, { expiresIn: `${ttlMin}m` });
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.passwordService.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
      },
    });

    const verificationToken = await this.verificationTokenService.issue(
      user.id,
      VerificationTokenType.EMAIL_VERIFY,
    );
    await this.mailService.sendVerificationEmail(user.email, verificationToken);

    const refreshToken = await this.refreshTokenService.issue(user.id);
    return {
      user: { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles },
      accessToken: this.signAccessToken(user),
      refreshToken: refreshToken.raw,
      refreshExpiresAt: refreshToken.expiresAt,
    };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await this.passwordService.verifyPassword(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const refreshToken = await this.refreshTokenService.issue(user.id);
    return {
      user: { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles },
      accessToken: this.signAccessToken(user),
      refreshToken: refreshToken.raw,
      refreshExpiresAt: refreshToken.expiresAt,
    };
  }

  async refresh(rawRefreshToken: string): Promise<AuthResult> {
    const { userId, token } = await this.refreshTokenService.rotate(rawRefreshToken);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return {
      user: { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles },
      accessToken: this.signAccessToken(user),
      refreshToken: token.raw,
      refreshExpiresAt: token.expiresAt,
    };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    await this.refreshTokenService.revoke(rawRefreshToken);
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const userId = await this.verificationTokenService.consume(rawToken, VerificationTokenType.EMAIL_VERIFY);
    await this.prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether the email exists.
      return;
    }
    const token = await this.verificationTokenService.issue(user.id, VerificationTokenType.PASSWORD_RESET);
    await this.mailService.sendPasswordResetEmail(user.email, token);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const userId = await this.verificationTokenService.consume(rawToken, VerificationTokenType.PASSWORD_RESET);
    const passwordHash = await this.passwordService.hashPassword(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    // Password changed: force re-login on every device.
    await this.refreshTokenService.revokeAllForUser(userId);
  }
}
