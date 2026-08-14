import { Injectable } from '@nestjs/common';
import { FaceMatchProvider, FaceMatchResult } from './face-match.provider';
import { loadEnv } from '../../../common/config/env';

/**
 * Returns whatever `REKOGNITION_STUB_CONFIDENCE` is set to (default 95).
 * Set it below the threshold (e.g. 60) to exercise the rejection path
 * locally without hitting AWS.
 */
@Injectable()
export class FaceMatchStubProvider implements FaceMatchProvider {
  async compare(_selfieKey: string, photoKeys: string[]): Promise<FaceMatchResult> {
    if (photoKeys.length === 0) {
      // No profile photos to compare against — surfaced as a rejection so
      // the user re-uploads photos before retrying verification.
      return { bestSimilarity: 0, reason: 'no_face_in_photos' };
    }
    const conf = loadEnv().REKOGNITION_STUB_CONFIDENCE;
    if (conf < loadEnv().FACE_MATCH_THRESHOLD) {
      return { bestSimilarity: conf, reason: 'low_similarity' };
    }
    return { bestSimilarity: conf };
  }
}
