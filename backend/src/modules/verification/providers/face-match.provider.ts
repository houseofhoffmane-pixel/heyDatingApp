/**
 * Face-match provider — compares a selfie against the user's profile
 * photos. Lives behind an interface so the Rekognition impl swaps for the
 * stub (and any future provider) cleanly.
 *
 * Returns the *best* similarity across all photos plus an optional reason
 * code the UI can surface ("face was partly out of frame", etc.) — these
 * are the same strings the rejected-verification screen shows.
 *
 * Selected at module-load time by REKOGNITION_PROVIDER=stub|real.
 */
export const FACE_MATCH_PROVIDER = Symbol('FACE_MATCH_PROVIDER');

export type FaceMatchReason =
  | 'no_face_in_selfie'
  | 'no_face_in_photos'
  | 'face_out_of_frame'
  | 'low_quality'
  | 'low_similarity'
  | 'pose_mismatch';

export interface FaceMatchResult {
  /** 0..100 — Rekognition's similarity score, max across compared photos. */
  bestSimilarity: number;
  /** Set when similarity is low *and* we have a more specific signal. */
  reason?: FaceMatchReason;
}

export interface FaceMatchProvider {
  /**
   * Compare a selfie against up to N profile photos. Implementations
   * decide whether to fetch bytes themselves or hand S3 references to
   * the upstream service.
   */
  compare(selfieS3Key: string, photoS3Keys: string[]): Promise<FaceMatchResult>;
}
