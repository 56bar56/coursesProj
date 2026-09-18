import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';
import { VerificationTokenService } from './verification-token.service';

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    RefreshTokenService,
    VerificationTokenService,
  ],
  exports: [PasswordService],
})
export class AuthModule {}
