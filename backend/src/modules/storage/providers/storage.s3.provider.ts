import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider, SignedUploadUrl, HeadResult } from './storage.provider';
import { loadEnv } from '../../../common/config/env';
import { ApiError } from '../../../common/errors/api-error';

/**
 * Real S3 implementation. Presigns PUT URLs the client uploads to directly,
 * GET URLs the client reads from directly. Our backend never touches the
 * bytes — saving bandwidth and letting S3 enforce size limits via the
 * presign policy.
 *
 * Activated by S3_PROVIDER=real. Requires AWS_REGION + S3_BUCKET +
 * credentials in env (or an IAM role in production).
 */
@Injectable()
export class StorageS3Provider implements StorageProvider {
  private readonly logger = new Logger(StorageS3Provider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const env = loadEnv();
    if (!env.S3_BUCKET) {
      throw new Error('S3_PROVIDER=real requires S3_BUCKET');
    }
    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      region: env.AWS_REGION,
      credentials:
        env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.AWS_ACCESS_KEY_ID,
              secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined, // fall through to ambient creds (IAM role / env)
    });
  }

  async signUpload(opts: { prefix: string; contentType: string; maxBytes: number }): Promise<SignedUploadUrl> {
    const env = loadEnv();
    const ext = extFromContentType(opts.contentType);
    const s3Key = `${opts.prefix}/${randomUUID()}${ext}`;
    const ttl = env.STORAGE_URL_TTL_S;
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: opts.contentType,
      ContentLength: opts.maxBytes,
    });
    const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn: ttl });
    return {
      uploadUrl,
      s3Key,
      headers: { 'Content-Type': opts.contentType },
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };
  }

  async signRead(s3Key: string, ttlSeconds?: number): Promise<string> {
    const ttl = ttlSeconds ?? loadEnv().STORAGE_URL_TTL_S;
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: s3Key });
    return getSignedUrl(this.client, cmd, { expiresIn: ttl });
  }

  async head(s3Key: string): Promise<HeadResult> {
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: s3Key }));
      return {
        exists: true,
        contentType: res.ContentType,
        size: res.ContentLength,
      };
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') {
        return { exists: false };
      }
      throw err;
    }
  }

  async remove(s3Key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: s3Key }));
  }

  async readStream(_s3Key: string): Promise<NodeJS.ReadableStream> {
    // Direct streaming via S3 isn't wired here because clients should fetch
    // via the signed URL. If a feature needs server-side reads (e.g.
    // verification worker pulling the selfie for Rekognition), add a
    // GetObjectCommand handler in the calling service.
    throw ApiError.internal('STORAGE_NOT_SUPPORTED', 'Use signRead() for client access.');
  }

  async writeBuffer(s3Key: string, buf: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: buf,
        ContentType: contentType,
      }),
    );
  }
}

function extFromContentType(ct: string): string {
  switch (ct) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/heic':
      return '.heic';
    default:
      return '.bin';
  }
}
