import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { PhotoStatus, UserStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { bullmqConnection } from '../../../common/queue/bullmq.connection';
import { QUEUE_FACE_MATCH } from '../../../common/queue/queue-names';
import { loadEnv } from '../../../common/config/env';
import { FACE_MATCH_PROVIDER, FaceMatchProvider } from '../providers/face-match.provider';

interface FaceMatchJobData {
  verificationId: string;
  userId: string;
}

/**
 * BullMQ worker for `face-match`. One per process; concurrency capped so a
 * burst of submissions doesn't spike Rekognition costs / API quotas.
 *
 * Flow:
 *   1. Load the Verification row + the user's approved profile photos.
 *   2. Skip if no longer pending (e.g. admin already actioned).
 *   3. Call the face-match provider → max similarity + optional reason.
 *   4. Approve or reject in a transaction.
 *   5. On approval: flip user.status → active, auto-delete the selfie
 *      bytes (§10 retention rule), insert an in-app Notification.
 *
 * Job options (set in VerificationService): 3 attempts with exponential
 * backoff covers transient AWS errors. Permanent failures bubble to
 * BullMQ's failed-jobs list — visible via /admin queues (Step 12).
 */
@Injectable()
export class FaceMatchProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FaceMatchProcessor.name);
  private worker?: Worker<FaceMatchJobData>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    @Inject(FACE_MATCH_PROVIDER) private readonly matcher: FaceMatchProvider,
  ) {}

  onModuleInit() {
    this.worker = new Worker<FaceMatchJobData>(
      QUEUE_FACE_MATCH,
      async (job) => this.process(job),
      {
        connection: bullmqConnection(),
        concurrency: 2,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `face-match job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`,
      );
    });
    this.worker.on('completed', (job) => {
      this.logger.log(`face-match job ${job.id} completed`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  // ── job body ─────────────────────────────────────────────────

  private async process(job: Job<FaceMatchJobData>): Promise<void> {
    const { verificationId, userId } = job.data;
    const env = loadEnv();
    const threshold = env.FACE_MATCH_THRESHOLD;

    const verification = await this.prisma.verification.findUnique({ where: { id: verificationId } });
    if (!verification) {
      this.logger.warn(`face-match: verification ${verificationId} vanished — skipping`);
      return;
    }
    if (verification.status !== VerificationStatus.pending) {
      this.logger.log(`face-match: verification ${verificationId} no longer pending (${verification.status})`);
      return;
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        photos: {
          where: { status: PhotoStatus.approved },
          orderBy: { position: 'asc' },
        },
      },
    });
    const photoKeys = profile?.photos.map((p) => p.s3Key) ?? [];

    const result = await this.matcher.compare(verification.selfieS3Key, photoKeys);
    const passed = result.bestSimilarity >= threshold;

    if (passed) {
      await this.prisma.$transaction([
        this.prisma.verification.update({
          where: { id: verification.id },
          data: {
            status: VerificationStatus.approved,
            matchConfidence: result.bestSimilarity,
            rejectReason: null,
          },
        }),
        // Spec §3.6 + §10: hard gate — once approved the user becomes
        // discoverable, *unless* they paused/hid in the interim.
        this.prisma.user.updateMany({
          where: { id: userId, status: UserStatus.pending_verification },
          data: { status: UserStatus.active },
        }),
      ]);

      await this.notifications.fanOut(
        userId,
        'verification.approved',
        { matchConfidence: result.bestSimilarity },
        {
          respectQuietHours: false, // important status — bypass quiet hours
          push: {
            title: 'you\'re verified',
            body: 'a little ✓ next to your name. use it wisely.',
            data: { type: 'verification.approved' },
          },
        },
      ).catch(() => undefined);

      // §10 retention: drop the selfie bytes once we've recorded the score.
      try {
        await this.storage.remove(verification.selfieS3Key);
      } catch (err) {
        this.logger.warn(`failed to purge selfie ${verification.selfieS3Key}: ${err}`);
      }
      return;
    }

    // ── rejection path ─────────────────────────────────────────
    await this.prisma.verification.update({
      where: { id: verification.id },
      data: {
        status: VerificationStatus.rejected,
        matchConfidence: result.bestSimilarity,
        rejectReason: result.reason ?? 'low_similarity',
      },
    });
    await this.notifications.fanOut(
      userId,
      'verification.rejected',
      {
        reason: result.reason ?? 'low_similarity',
        attempt: verification.attempt,
        attemptsRemaining: Math.max(0, 3 - verification.attempt),
      },
      {
        respectQuietHours: false,
        push: {
          title: 'verification didn\'t pass',
          body: rejectionBlurb(result.reason ?? 'low_similarity'),
          data: { type: 'verification.rejected' },
        },
      },
    ).catch(() => undefined);
  }
}

function rejectionBlurb(reason: string): string {
  switch (reason) {
    case 'no_face_in_selfie':  return 'we couldn\'t see your face — try again in better light.';
    case 'face_out_of_frame':  return 'face was partly out of frame — try again.';
    case 'low_quality':        return 'lighting was too dim — try again in good light.';
    case 'no_face_in_photos':  return 'add a clear profile photo first, then retry.';
    default:                    return 'try again with a clearer selfie.';
  }
}
