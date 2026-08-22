import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from 'fs';
import { writeFile, unlink, stat } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { StorageProvider, SignedUploadUrl, HeadResult } from './storage.provider';
import { loadEnv } from '../../../common/config/env';
import { ApiError } from '../../../common/errors/api-error';

/**
 * Local-disk implementation of the storage provider.
 *
 * Files live under `S3_STUB_DIR/<prefix>/<uuid><ext>`. Upload/read URLs
 * point back at the in-process StorageController; the URL embeds an
 * HMAC-signed payload (s3Key + method + expiresAt) so they're tamper-proof
 * and short-lived.
 *
 * Anything except the URL signing is identical to what the S3 provider
 * exposes — callers (PhotosService) don't know which one's mounted.
 */
@Injectable()
export class StorageStubProvider implements StorageProvider {
  private readonly logger = new Logger(StorageStubProvider.name);

  private get root() {
    return resolve(loadEnv().S3_STUB_DIR);
  }

  private get publicBase() {
    // Return '' → relative URLs like `/api/v1/_storage/read?...`.
    // Same-origin: SPA and API are served by the same Node process, so
    // the browser resolves the URL against whatever host it's on.
    // Works on any deploy (Railway, custom domain, localhost dev)
    // without needing PUBLIC_BASE_URL configured correctly. Only set
    // an absolute host if PUBLIC_BASE_URL is explicitly configured —
    // useful when photos need to be linked from an external context
    // (email, push payload).
    const env = loadEnv();
    return env.PUBLIC_BASE_URL ?? '';
  }

  private get signSecret() {
    // Reuse the access-token secret for HMAC signing. Different namespace
    // because we prefix with 'storage:' in the HMAC input.
    return loadEnv().JWT_ACCESS_SECRET;
  }

  // ── interface ────────────────────────────────────────────────

  async signUpload(opts: { prefix: string; contentType: string; maxBytes: number }): Promise<SignedUploadUrl> {
    const ext = extFromContentType(opts.contentType);
    const s3Key = `${opts.prefix}/${randomUUID()}${ext}`;
    const url = this.signedUrl(s3Key, 'PUT');
    return {
      uploadUrl: url.url,
      s3Key,
      headers: { 'Content-Type': opts.contentType },
      expiresAt: url.expiresAt,
    };
  }

  async signRead(s3Key: string, ttlSeconds?: number): Promise<string> {
    return this.signedUrl(s3Key, 'GET', ttlSeconds).url;
  }

  async head(s3Key: string): Promise<HeadResult> {
    const path = this.absolutePath(s3Key);
    try {
      const s = await stat(path);
      return { exists: true, size: s.size };
    } catch {
      return { exists: false };
    }
  }

  async remove(s3Key: string): Promise<void> {
    const path = this.absolutePath(s3Key);
    try {
      await unlink(path);
    } catch (err: any) {
      if (err?.code !== 'ENOENT') throw err;
    }
  }

  async readStream(s3Key: string): Promise<NodeJS.ReadableStream> {
    const path = this.absolutePath(s3Key);
    if (!existsSync(path)) {
      throw ApiError.notFound('OBJECT_NOT_FOUND', 'Object not found.');
    }
    return createReadStream(path);
  }

  async writeBuffer(s3Key: string, buf: Buffer, _contentType: string): Promise<void> {
    const path = this.absolutePath(s3Key);
    this.ensureDir(path);
    await writeFile(path, buf);
  }

  // ── URL signing helpers (used by StorageController) ───────────

  /**
   * Validate a signed URL. Returns the s3Key if valid; throws otherwise.
   * Called by the storage controller to gate PUT/GET.
   */
  validateToken(token: string, expectedMethod: 'GET' | 'PUT', expectedKey: string): void {
    let payload: { k: string; m: string; e: number; s: string };
    try {
      payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    } catch {
      throw ApiError.forbidden('STORAGE_TOKEN_INVALID', 'Bad storage token.');
    }
    if (payload.k !== expectedKey || payload.m !== expectedMethod) {
      throw ApiError.forbidden('STORAGE_TOKEN_INVALID', 'Storage token does not match request.');
    }
    if (Date.now() / 1000 > payload.e) {
      throw ApiError.forbidden('STORAGE_TOKEN_EXPIRED', 'Storage token expired.');
    }
    const expected = this.hmac(`${payload.k}|${payload.m}|${payload.e}`);
    if (payload.s !== expected) {
      throw ApiError.forbidden('STORAGE_TOKEN_INVALID', 'Bad storage signature.');
    }
  }

  // ── internals ────────────────────────────────────────────────

  private signedUrl(s3Key: string, method: 'GET' | 'PUT', ttlSeconds?: number) {
    const ttl = ttlSeconds ?? loadEnv().STORAGE_URL_TTL_S;
    const exp = Math.floor(Date.now() / 1000) + ttl;
    const sig = this.hmac(`${s3Key}|${method}|${exp}`);
    const payload = { k: s3Key, m: method, e: exp, s: sig };
    const token = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const endpoint = method === 'PUT' ? 'upload' : 'read';
    // s3Key goes in the query string — keys contain `/` (e.g. photos/abc.jpg)
    // and Express handling of %2F in path params is inconsistent.
    return {
      url: `${this.publicBase}/api/v1/_storage/${endpoint}?key=${encodeURIComponent(s3Key)}&token=${token}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }

  private hmac(input: string): string {
    return createHmac('sha256', this.signSecret).update(input).digest('hex');
  }

  private absolutePath(s3Key: string): string {
    // Disallow traversal — keep keys inside the root.
    const safe = s3Key.replace(/\.\./g, '');
    return join(this.root, safe);
  }

  private ensureDir(filePath: string) {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
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
