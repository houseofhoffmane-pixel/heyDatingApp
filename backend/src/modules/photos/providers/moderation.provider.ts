/**
 * Photo moderation provider — used to flag NSFW or otherwise rejectable
 * uploads. Sync today (so confirm returns the final status immediately);
 * if the moderator becomes slow / external it can move behind BullMQ.
 *
 * One implementation lands in Step 3 (stub: always approve). Step 4
 * swaps in AWS Rekognition's DetectModerationLabels alongside the
 * face-match used for verification.
 */
export const PHOTO_MODERATION = Symbol('PHOTO_MODERATION');

export interface ModerationResult {
  status: 'approved' | 'rejected';
  nsfwScore: number;       // 0..1
  reason?: string;
}

export interface PhotoModerationProvider {
  moderate(s3Key: string): Promise<ModerationResult>;
}
