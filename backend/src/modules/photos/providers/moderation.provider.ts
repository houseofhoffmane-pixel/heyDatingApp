/**
 * Photo moderation provider — used to flag NSFW or otherwise rejectable
 * uploads. Sync today (so confirm returns the final status immediately).
 *
 * Ship-scope: only the stub (always approve). Plug in a real moderator
 * (AWS Rekognition DetectModerationLabels, Cloudflare NSFW, hand-rolled
 * model, etc.) via the same factory pattern used elsewhere when needed.
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
