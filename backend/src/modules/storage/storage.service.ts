import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_PROVIDER, StorageProvider, SignedUploadUrl, HeadResult } from './providers/storage.provider';

/**
 * Thin facade so feature modules (PhotosService, VerificationService,
 * AdminPlacesService) inject one consistent service rather than the
 * provider token directly. Keeps the provider swap (`STORAGE_PROVIDER=stub
 * | real`) invisible to callers.
 */
@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  signUpload(opts: { prefix: string; contentType: string; maxBytes: number }): Promise<SignedUploadUrl> {
    return this.provider.signUpload(opts);
  }

  signRead(s3Key: string, ttlSeconds?: number): Promise<string> {
    return this.provider.signRead(s3Key, ttlSeconds);
  }

  head(s3Key: string): Promise<HeadResult> {
    return this.provider.head(s3Key);
  }

  remove(s3Key: string): Promise<void> {
    return this.provider.remove(s3Key);
  }

  readStream(s3Key: string) {
    return this.provider.readStream(s3Key);
  }

  writeBuffer(s3Key: string, buf: Buffer, contentType: string) {
    return this.provider.writeBuffer(s3Key, buf, contentType);
  }
}
