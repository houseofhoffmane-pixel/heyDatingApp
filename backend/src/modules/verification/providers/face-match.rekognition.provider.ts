import { Injectable, Logger } from '@nestjs/common';
import {
  RekognitionClient,
  CompareFacesCommand,
  DetectFacesCommand,
} from '@aws-sdk/client-rekognition';
import { FaceMatchProvider, FaceMatchResult, FaceMatchReason } from './face-match.provider';
import { loadEnv } from '../../../common/config/env';

/**
 * Real AWS Rekognition implementation.
 *
 * For each profile photo we call CompareFaces(selfie, photo) and take the
 * maximum similarity. If no profile photo yields a face match, we run a
 * single DetectFaces on the selfie to give the user a more specific
 * reason ("no face detected" / "face out of frame") rather than the
 * generic "low similarity".
 *
 * Assumes S3_PROVIDER=real so the images are addressable by bucket+key
 * (Rekognition reads them directly from S3 — no bytes through the API).
 * Throws on construction if the bucket isn't set.
 */
@Injectable()
export class FaceMatchRekognitionProvider implements FaceMatchProvider {
  private readonly logger = new Logger(FaceMatchRekognitionProvider.name);
  private readonly client: RekognitionClient;
  private readonly bucket: string;
  private readonly threshold: number;

  constructor() {
    const env = loadEnv();
    if (env.S3_PROVIDER !== 'real' || !env.S3_BUCKET) {
      throw new Error('REKOGNITION_PROVIDER=real requires S3_PROVIDER=real + S3_BUCKET');
    }
    this.bucket = env.S3_BUCKET;
    this.threshold = env.FACE_MATCH_THRESHOLD;
    this.client = new RekognitionClient({
      region: env.REKOGNITION_REGION,
      credentials:
        env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.AWS_ACCESS_KEY_ID,
              secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async compare(selfieKey: string, photoKeys: string[]): Promise<FaceMatchResult> {
    if (photoKeys.length === 0) {
      return { bestSimilarity: 0, reason: 'no_face_in_photos' };
    }

    let best = 0;
    let noFacesInTarget = true;

    for (const photoKey of photoKeys) {
      try {
        const res = await this.client.send(
          new CompareFacesCommand({
            SourceImage: { S3Object: { Bucket: this.bucket, Name: selfieKey } },
            TargetImage: { S3Object: { Bucket: this.bucket, Name: photoKey } },
            SimilarityThreshold: 0, // we'll compare against our own threshold
            QualityFilter: 'AUTO',
          }),
        );
        if (res.UnmatchedFaces?.length || res.FaceMatches?.length) {
          noFacesInTarget = false;
        }
        for (const m of res.FaceMatches ?? []) {
          if ((m.Similarity ?? 0) > best) best = m.Similarity ?? 0;
        }
      } catch (err: any) {
        // InvalidParameterException is what Rekognition throws when no face
        // can be found in the source image — short-circuit and report.
        if (err?.name === 'InvalidParameterException') {
          const reason = await this.diagnoseSelfie(selfieKey);
          return { bestSimilarity: 0, reason };
        }
        this.logger.warn(`CompareFaces failed for ${photoKey}: ${err?.message ?? err}`);
      }
    }

    if (best >= this.threshold) return { bestSimilarity: best };

    if (noFacesInTarget) return { bestSimilarity: best, reason: 'no_face_in_photos' };
    return { bestSimilarity: best, reason: 'low_similarity' };
  }

  /** Inspect the selfie alone to give the user a better rejection reason. */
  private async diagnoseSelfie(selfieKey: string): Promise<FaceMatchReason> {
    try {
      const res = await this.client.send(
        new DetectFacesCommand({
          Image: { S3Object: { Bucket: this.bucket, Name: selfieKey } },
          Attributes: ['DEFAULT'],
        }),
      );
      const faces = res.FaceDetails ?? [];
      if (faces.length === 0) return 'no_face_in_selfie';
      const f = faces[0];
      const box = f.BoundingBox;
      if (box && (box.Left! < 0.02 || box.Top! < 0.02 || (box.Left! + box.Width!) > 0.98 || (box.Top! + box.Height!) > 0.98)) {
        return 'face_out_of_frame';
      }
      const quality = f.Quality;
      if (quality && ((quality.Brightness ?? 100) < 25 || (quality.Sharpness ?? 100) < 25)) {
        return 'low_quality';
      }
      return 'low_similarity';
    } catch {
      return 'low_similarity';
    }
  }
}
