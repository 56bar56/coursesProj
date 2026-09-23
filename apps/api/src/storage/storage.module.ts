import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { SignedUrlService } from './signed-url.service';
import { LocalFileService } from './local-file.service';

@Module({
  controllers: [StorageController],
  providers: [SignedUrlService, LocalFileService],
  exports: [SignedUrlService, LocalFileService],
})
export class StorageModule {}
