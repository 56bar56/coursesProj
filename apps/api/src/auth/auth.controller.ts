import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { OriginCheckGuard } from '../common/guards/origin-check.guard';
import { AuthService } from './auth.service';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, baseCookieOptions } from './constants';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { Env } from '../config/env.schema';

interface AuthResultLike {
  user: { id: string; email: string; displayName: string; roles: unknown };
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Controller('auth')
@UseGuards(OriginCheckGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private setAuthCookies(res: Response, result: AuthResultLike): void {
    const isProduction = this.config.get('NODE_ENV', { infer: true }) === 'production';
    const accessTtlMin = this.config.get('ACCESS_TOKEN_TTL_MIN', { infer: true });
    const options = baseCookieOptions(isProduction);

    res.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, {
      ...options,
      expires: new Date(Date.now() + accessTtlMin * 60 * 1000),
    });
    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      ...options,
      expires: result.refreshExpiresAt,
    });
  }

  private clearAuthCookies(res: Response): void {
    const isProduction = this.config.get('NODE_ENV', { infer: true }) === 'production';
    const options = baseCookieOptions(isProduction);
    res.clearCookie(ACCESS_TOKEN_COOKIE, options);
    res.clearCookie(REFRESH_TOKEN_COOKIE, options);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const result = await this.authService.refresh(rawRefreshToken);
    this.setAuthCookies(res, result);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (rawRefreshToken) {
      await this.authService.logout(rawRefreshToken);
    }
    this.clearAuthCookies(res);
    return { success: true };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return { success: true };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { success: true };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { success: true };
  }
}
