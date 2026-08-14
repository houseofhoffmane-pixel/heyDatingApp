/**
 * Storage provider interface — used for everything that needs to put bytes
 * in front of users (profile photos, verification selfies, attachments
 * later). One interface, two implementations:
 *   - StorageStubProvider: writes to local disk, signs short-lived URLs that
 *     resolve to the in-process StorageController. Lets the whole app run
 *     with no AWS creds.
 *   - StorageS3Provider: real AWS S3 + presigned URLs via @aws-sdk.
 *
 * Toggle via S3_PROVIDER=stub|real in .env.
 */

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface SignedUploadUrl {
  /** URL the client PUTs the file to. */
  uploadUrl: string;
  /** Object key the server uses to refer to it later (photos.s3_key). */
  s3Key: string;
  /** Headers the client must include with the PUT (Content-Type, etc.). */
  headers?: Record<string, string>;
  /** When this URL stops being valid (ISO). */
  expiresAt: string;
}

export interface HeadResult {
  exists: boolean;
  contentType?: string;
  size?: number;
}

export interface StorageProvider {
  /** Generate a signed PUT URL for the client to upload to. */
  signUpload(opts: {
    prefix: string;          // e.g. 'photos' | 'selfies'
    contentType: string;
    maxBytes: number;
  }): Promise<SignedUploadUrl>;

  /** Generate a signed GET URL for the client to read the object. */
  signRead(s3Key: string, ttlSeconds?: number): Promise<string>;

  /** Cheap existence + metadata check. */
  head(s3Key: string): Promise<HeadResult>;

  /** Delete an object (used on photo removal and selfie auto-purge). */
  remove(s3Key: string): Promise<void>;

  /** Stream a stored object's bytes — used by the stub controller. */
  readStream(s3Key: string): Promise<NodeJS.ReadableStream>;

  /** Write bytes (server-side only — used by the stub controller). */
  writeBuffer(s3Key: string, buf: Buffer, contentType: string): Promise<void>;
}
