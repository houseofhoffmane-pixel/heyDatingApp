import { Module } from '@nestjs/common';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { PHOTO_MODERATION } from './providers/moderation.provider';
import { PhotoModerationStubProvider } from './providers/moderation.stub.provider';

@Module({
  controllers: [PhotosController],
  providers: [
    PhotosService,
    PhotoModerationStubProvider,
    {
      // Stub approves every upload. Swap to a real moderator (Rekognition
      // DetectModerationLabels or similar) via env-driven select later.
      provide: PHOTO_MODERATION,
      useExisting: PhotoModerationStubProvider,
    },
  ],
  exports: [PhotosService],
})
export class PhotosModule {}
