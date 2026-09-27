import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';
import { BookingsModule } from '../bookings/bookings.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FakePaymentProvider } from './providers/fake-payment.provider';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';
import { FakeProviderOnlyGuard } from './guards/fake-provider-only.guard';
import type { Env } from '../config/env.schema';

@Module({
  imports: [MailModule, BookingsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    FakePaymentProvider,
    FakeProviderOnlyGuard,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (config: ConfigService<Env, true>, fake: FakePaymentProvider) => {
        const provider = config.get('PAYMENT_PROVIDER', { infer: true });
        if (provider === 'fake') {
          return fake;
        }
        throw new Error(`Unsupported PAYMENT_PROVIDER: ${provider}`);
      },
      inject: [ConfigService, FakePaymentProvider],
    },
  ],
})
export class PaymentsModule {}
