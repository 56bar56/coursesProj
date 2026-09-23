import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [StorageModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
