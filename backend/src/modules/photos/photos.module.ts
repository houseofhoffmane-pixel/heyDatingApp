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
      // Step 4 swaps a Rekognition implementation in via env-driven select.
      provide: PHOTO_MODERATION,
      useExisting: PhotoModerationStubProvider,
    },
  ],
  exports: [PhotosService],
})
export class PhotosModule {}
