import { Inject, Injectable, Logger } from '@nestjs/common';
import { PhotoStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { StorageService } from '../storage/storage.service';
import { loadEnv } from '../../common/config/env';
import { UploadUrlDto } from './dto/upload-url.dto';
import { ConfirmPhotoDto } from './dto/confirm.dto';
import { ReorderPhotosDto } from './dto/reorder.dto';
import { PHOTO_MODERATION, PhotoModerationProvider } from './providers/moderation.provider';

const PHOTO_PREFIX = 'photos';
const MAX_PHOTOS = 6;

/**
 * Owns the profile-photo lifecycle:
 *   1. /photos/upload-url        → returns a presigned PUT URL + s3Key
 *   2. (client PUTs the image)
 *   3. /photos/confirm           → moderate + insert Photo row, set position
 *   4. /photos/reorder           → swap positions (0 = main)
 *   5. /photos/:id   DELETE      → drop row + best-effort delete object
 *
 * Position rules: 0 is main, slots 1..5 are secondary; spec requires
 * 2–6 photos and ≥2 to advance onboarding. Each (profile_id, position)
 * pair is unique at the DB level; reorders happen in a single transaction
 * to avoid clashing on that index.
 */
@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(PHOTO_MODERATION) private readonly moderation: PhotoModerationProvider,
  ) {}

  // ── /photos/upload-url ───────────────────────────────────────

  async uploadUrl(userId: string, dto: UploadUrlDto) {
    const profile = await this.ensureProfile(userId);
    const count = await this.prisma.photo.count({ where: { profileId: profile.id } });
    if (count >= MAX_PHOTOS) {
      throw ApiError.badRequest('PHOTOS_FULL', 'You\'ve already added the max number of photos.');
    }

    const env = loadEnv();
    const signed = await this.storage.signUpload({
      prefix: PHOTO_PREFIX,
      contentType: dto.contentType,
      maxBytes: env.PHOTO_MAX_MB * 1024 * 1024,
    });
    return signed;
  }

  // ── /photos/confirm ──────────────────────────────────────────

  async confirm(userId: string, dto: ConfirmPhotoDto) {
    const profile = await this.ensureProfile(userId);

    // Guard rails: key must be from our photo bucket and the object must exist.
    if (!dto.s3Key.startsWith(`${PHOTO_PREFIX}/`)) {
      throw ApiError.badRequest('PHOTO_KEY_INVALID', 'Bad photo key.');
    }
    const head = await this.storage.head(dto.s3Key);
    if (!head.exists) {
      throw ApiError.badRequest('PHOTO_NOT_UPLOADED', 'Upload didn\'t reach storage. Try again.');
    }

    // Sync moderation pass — stub approves; real Rekognition in Step 4.
    const mod = await this.moderation.moderate(dto.s3Key);
    if (mod.status === 'rejected') {
      // Don't keep rejected bytes on disk in stub mode.
      await this.storage.remove(dto.s3Key).catch(() => undefined);
      throw ApiError.unprocessable('PHOTO_REJECTED', mod.reason ?? 'Photo didn\'t pass moderation.');
    }

    // Pick the next position if not supplied.
    const taken = await this.prisma.photo.findMany({
      where: { profileId: profile.id },
      select: { position: true },
      orderBy: { position: 'asc' },
    });
    let position = dto.position;
    if (position === undefined) {
      for (let i = 0; i < MAX_PHOTOS; i++) {
        if (!taken.some((t) => t.position === i)) {
          position = i;
          break;
        }
      }
    } else if (taken.some((t) => t.position === position)) {
      throw ApiError.conflict('PHOTO_SLOT_TAKEN', 'That photo slot is already taken.');
    }
    if (position === undefined) {
      throw ApiError.badRequest('PHOTOS_FULL', 'No open slots.');
    }

    const photo = await this.prisma.photo.create({
      data: {
        profileId: profile.id,
        userId,
        s3Key: dto.s3Key,
        position,
        isMain: position === 0,
        status: mod.status === 'approved' ? PhotoStatus.approved : PhotoStatus.pending,
        nsfwScore: mod.nsfwScore,
      },
    });

    return {
      id: photo.id,
      position: photo.position,
      isMain: photo.isMain,
      status: photo.status,
      url: await this.storage.signRead(photo.s3Key),
    };
  }

  // ── /photos/:id  DELETE ──────────────────────────────────────

  async remove(userId: string, photoId: string) {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) throw ApiError.notFound('PHOTO_NOT_FOUND', 'Photo not found.');
    if (photo.userId !== userId) throw ApiError.forbidden('PHOTO_NOT_OWNED', 'Not your photo.');

    await this.prisma.photo.delete({ where: { id: photoId } });
    // Best-effort — orphaned bytes are tolerable; missing object isn't.
    this.storage.remove(photo.s3Key).catch((err) =>
      this.logger.warn(`storage.remove failed for ${photo.s3Key}: ${err}`),
    );

    return { ok: true };
  }

  // ── /photos/reorder ──────────────────────────────────────────

  async reorder(userId: string, dto: ReorderPhotosDto) {
    const profile = await this.ensureProfile(userId);
    const photos = await this.prisma.photo.findMany({ where: { profileId: profile.id } });
    const owned = new Set(photos.map((p) => p.id));
    for (const id of dto.orderedIds) {
      if (!owned.has(id)) {
        throw ApiError.forbidden('PHOTO_NOT_OWNED', 'You can only reorder your own photos.');
      }
    }
    if (dto.orderedIds.length !== photos.length) {
      throw ApiError.badRequest('REORDER_INCOMPLETE', 'Include every photo id.');
    }

    // Two-phase rewrite avoids the (profile_id, position) unique constraint
    // clashing in the middle of the rewrite: push to position 10+i first,
    // then snap back to 0..n.
    await this.prisma.$transaction([
      ...dto.orderedIds.map((id, i) =>
        this.prisma.photo.update({
          where: { id },
          data: { position: 10 + i, isMain: false },
        }),
      ),
      ...dto.orderedIds.map((id, i) =>
        this.prisma.photo.update({
          where: { id },
          data: { position: i, isMain: i === 0 },
        }),
      ),
    ]);

    return this.listForOwner(userId);
  }

  // ── helper used by GET /me + reorder response ────────────────

  async listForOwner(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { photos: { orderBy: { position: 'asc' } } },
    });
    if (!profile) return [];
    return Promise.all(
      profile.photos.map(async (p) => ({
        id: p.id,
        position: p.position,
        isMain: p.isMain,
        status: p.status,
        url: await this.storage.signRead(p.s3Key),
      })),
    );
  }

  // ── internals ────────────────────────────────────────────────

  private async ensureProfile(userId: string) {
    let profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) profile = await this.prisma.profile.create({ data: { userId } });
    return profile;
  }
}
