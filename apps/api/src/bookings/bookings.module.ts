import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { StubVideoCallProvider } from './providers/stub-video-call.provider';
import { VIDEO_CALL_PROVIDER } from './providers/video-call-provider.interface';

@Module({
  imports: [MailModule],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    StubVideoCallProvider,
    { provide: VIDEO_CALL_PROVIDER, useExisting: StubVideoCallProvider },
  ],
  exports: [BookingsService],
})
export class BookingsModule {}
