import { Module } from '@nestjs/common';
import { ReviewsModule } from '../reviews/reviews.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [ReviewsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
