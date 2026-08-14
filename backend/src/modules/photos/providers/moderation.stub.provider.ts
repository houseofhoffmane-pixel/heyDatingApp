import { Injectable } from '@nestjs/common';
import { PhotoModerationProvider, ModerationResult } from './moderation.provider';

/**
 * Stub moderator — approves everything with a 0 score. Adequate for local
 * dev; in production replace with the Rekognition implementation (Step 4).
 */
@Injectable()
export class PhotoModerationStubProvider implements PhotoModerationProvider {
  async moderate(_s3Key: string): Promise<ModerationResult> {
    return { status: 'approved', nsfwScore: 0 };
  }
}
