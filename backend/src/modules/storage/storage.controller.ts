import {
  Controller, Get, Put, Query, Req, Res, HttpCode, HttpStatus, Inject, OnModuleInit, Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STORAGE_PROVIDER, StorageProvider } from './providers/storage.provider';
import { StorageStubProvider } from './providers/storage.stub.provider';
import { Public } from '../auth/decorators/public.decorator';
import { ApiError } from '../../common/errors/api-error';
import { loadEnv } from '../../common/config/env';

/**
 * In-process serving of stub upload/read URLs.
 *
 * Only meaningful when the storage provider is the stub — when S3 is real
 * clients PUT/GET direct to AWS and these endpoints are inert (they
 * `requireStub()` and 403 if pinged).
 *
 * URL shape (mirrored in StorageStubProvider.signedUrl):
 *   PUT /api/v1/_storage/upload?key=<urlEncodedS3Key>&token=<hmac>
 *   GET /api/v1/_storage/read?key=<urlEncodedS3Key>&token=<hmac>
 *
 * Keys go in the query string because they contain `/` (e.g.
 * `photos/abc.jpg`) and `%2F` in path params is inconsistent across
 * Express versions.
 */
@Controller('_storage')
export class StorageController implements OnModuleInit {
  private readonly logger = new Logger(StorageController.name);

  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  onModuleInit() {
    if (loadEnv().S3_PROVIDER === 'real') {
      this.logger.log('S3_PROVIDER=real — /_storage routes are inert; clients upload direct to S3.');
    }
  }

  private requireStub(): StorageStubProvider {
    if (!(this.provider instanceof StorageStubProvider)) {
      throw ApiError.forbidden('STORAGE_DIRECT_ONLY', 'Use the signed S3 URL — these endpoints are stub-only.');
    }
    return this.provider;
  }

  @Public()
  @Put('upload')
  @HttpCode(HttpStatus.OK)
  async upload(
    @Query('key') key: string,
    @Query('token') token: string,
    @Req() req: Request,
  ) {
    if (!key || !token) {
      throw ApiError.badRequest('STORAGE_PARAMS_MISSING', 'Missing key or token.');
    }
    const stub = this.requireStub();
    stub.validateToken(token, 'PUT', key);

    const env = loadEnv();
    const maxBytes = env.PHOTO_MAX_MB * 1024 * 1024;
    const contentType = req.headers['content-type'] || 'application/octet-stream';

    const chunks: Buffer[] = [];
    let total = 0;
    await new Promise<void>((resolveP, rejectP) => {
      req.on('data', (chunk: Buffer) => {
        total += chunk.length;
        if (total > maxBytes) {
          rejectP(
            ApiError.badRequest('UPLOAD_TOO_LARGE', `Upload exceeds ${env.PHOTO_MAX_MB}MB limit.`),
          );
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => resolveP());
      req.on('error', rejectP);
    });

    const buf = Buffer.concat(chunks);
    await this.provider.writeBuffer(key, buf, String(contentType));
    return { ok: true, s3Key: key, size: buf.length };
  }

  @Public()
  @Get('read')
  async read(
    @Query('key') key: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!key || !token) {
      throw ApiError.badRequest('STORAGE_PARAMS_MISSING', 'Missing key or token.');
    }
    const stub = this.requireStub();
    stub.validateToken(token, 'GET', key);

    const head = await this.provider.head(key);
    if (!head.exists) {
      throw ApiError.notFound('OBJECT_NOT_FOUND', 'Not found.');
    }
    const stream = await this.provider.readStream(key);
    if (head.contentType) res.setHeader('Content-Type', head.contentType);
    if (head.size != null) res.setHeader('Content-Length', String(head.size));
    res.setHeader('Cache-Control', 'private, max-age=60');
    stream.pipe(res);
  }
}
