import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ApiError } from '../../common/errors/api-error';
import { loadEnv } from '../../common/config/env';
import { bullmqConnection } from '../../common/queue/bullmq.connection';
import { QUEUE_FACE_MATCH } from '../../common/queue/queue-names';
import { OnboardingService } from '../onboarding/onboarding.service';
import { VerificationUploadUrlDto } from './dto/upload-url.dto';
import { VerificationSubmitDto } from './dto/submit.dto';

const SELFIE_PREFIX = 'selfies';
const MAX_AUTO_ATTEMPTS = 3;

/**
 * Owns the verification surface and the BullMQ queue side of it. The
 * actual face-match runs in FaceMatchProcessor (same module) — this
 * service:
 *   1. Hands out the pre-signed selfie URL.
 *   2. On submit:
 *      a) Asks OnboardingService.completeOnboardingOrThrow — if any
 *         mandatory field is missing this 422s and the flow stops.
 *      b) Inserts a Verification row at `pending`, attempt = prev + 1.
 *      c) Enqueues a face-match job; the worker picks it up.
 *   3. Exposes the current status for the polling UI.
 *
 * Past-3-attempt rule: §3.6 says max 3 before manual review. After three
 * rejections we 422 on /submit; the rejected row sits in the admin
 * `manual` queue for human review (Step 12).
 */
@Injectable()
export class VerificationService implements OnModuleDestroy {
  private readonly logger = new Logger(VerificationService.name);
  private readonly queue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly onboarding: OnboardingService,
  ) {
    this.queue = new Queue(QUEUE_FACE_MATCH, {
      connection: bullmqConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
      },
    });
  }

  async onModuleDestroy() {
    await this.queue.close();
  }

  // ── POST /verification/upload-url ────────────────────────────

  async uploadUrl(_userId: string, dto: VerificationUploadUrlDto) {
    const env = loadEnv();
    const signed = await this.storage.signUpload({
      prefix: SELFIE_PREFIX,
      contentType: dto.contentType,
      maxBytes: env.PHOTO_MAX_MB * 1024 * 1024,
    });
    return signed;
  }

  // ── POST /verification/submit ────────────────────────────────

  async submit(userId: string, dto: VerificationSubmitDto) {
    // 1) Already-verified users shouldn't be able to re-trigger this flow.
    const approved = await this.prisma.verification.findFirst({
      where: { userId, status: VerificationStatus.approved },
      select: { id: true },
    });
    if (approved) {
      throw ApiError.conflict('ALREADY_VERIFIED', 'You\'re already verified.');
    }

    // 2) Onboarding must be complete. Flips status to pending_verification
    //    only when the user is still in `onboarding` (no-op otherwise).
    await this.onboarding.completeOnboardingOrThrow(userId);

    // 3) Guard: max attempts reached → require manual review.
    const prior = await this.prisma.verification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const rejectedAttempts = prior.filter((v) => v.status === VerificationStatus.rejected).length;
    if (rejectedAttempts >= MAX_AUTO_ATTEMPTS) {
      throw ApiError.unprocessable(
        'MAX_ATTEMPTS',
        'You\'ve hit the auto-review limit. A reviewer will take a look.',
      );
    }
    // Don't allow a new submission while one is pending.
    if (prior[0]?.status === VerificationStatus.pending) {
      throw ApiError.conflict('VERIFICATION_PENDING', 'A verification is already pending.');
    }

    // 4) Selfie object must actually be uploaded and live in our selfie bucket.
    if (!dto.selfieS3Key.startsWith(`${SELFIE_PREFIX}/`)) {
      throw ApiError.badRequest('SELFIE_KEY_INVALID', 'Bad selfie key.');
    }
    const head = await this.storage.head(dto.selfieS3Key);
    if (!head.exists) {
      throw ApiError.badRequest('SELFIE_NOT_UPLOADED', 'Upload didn\'t reach storage. Try again.');
    }

    // 5) Insert pending row + enqueue.
    const attempt = rejectedAttempts + 1;
    const verification = await this.prisma.verification.create({
      data: {
        userId,
        selfieS3Key: dto.selfieS3Key,
        status: VerificationStatus.pending,
        attempt,
      },
    });

    await this.queue.add(
      'check',
      { verificationId: verification.id, userId },
      { jobId: verification.id }, // dedupe by row id — re-enqueues are no-ops
    );

    return {
      status: verification.status,
      attempt: verification.attempt,
      createdAt: verification.createdAt.toISOString(),
    };
  }

  // ── GET /verification/status ─────────────────────────────────

  async status(userId: string) {
    const latest = await this.prisma.verification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      return { status: null, attempt: 0, isVerified: false };
    }

    const isVerified = latest.status === VerificationStatus.approved;
    return {
      status: latest.status,
      attempt: latest.attempt,
      rejectReason: latest.rejectReason ?? undefined,
      matchConfidence: isVerified ? latest.matchConfidence ?? null : undefined,
      createdAt: latest.createdAt.toISOString(),
      isVerified,
    };
  }
}
