import { Injectable, Logger } from '@nestjs/common';
import { LikeAnchorType, Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { RateLimitService } from '../../common/ratelimit/ratelimit.service';
import { loadEnv } from '../../common/config/env';
import { ProfileShaper } from '../../common/profile/profile-shaper';
import { StorageService } from '../storage/storage.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLikeDto } from './dto/create-like.dto';
import { CreatePassDto } from './dto/create-pass.dto';

@Injectable()
export class LikesService {
  private readonly logger = new Logger(LikesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
    private readonly shaper: ProfileShaper,
    private readonly storage: StorageService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── POST /likes ──────────────────────────────────────────────

  async createLike(fromUserId: string, dto: CreateLikeDto) {
    if (fromUserId === dto.toUserId) {
      throw ApiError.badRequest('SELF_LIKE', 'You can\'t like yourself.');
    }

    // Daily quota — RL_LIKES_PER_DAY from env.
    const rl = await this.rateLimit.hit(
      `likes:day:${fromUserId}`,
      loadEnv().RL_LIKES_PER_DAY,
      24 * 60 * 60,
    );
    if (!rl.allowed) {
      throw ApiError.tooManyRequests(
        'LIKES_RATE_LIMITED',
        'You\'ve hit today\'s like limit. Take a breath.',
        rl.retryAfterSeconds,
      );
    }

    // Reject if either side has blocked the other. Never leak that fact.
    const blocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: fromUserId, blockedId: dto.toUserId },
          { blockerId: dto.toUserId, blockedId: fromUserId },
        ],
      },
    });
    if (blocked) throw ApiError.notFound('NOT_FOUND', 'User not found.');

    // Candidate must exist + be active. (Verification gate removed for web build.)
    const target = await this.prisma.user.findUnique({ where: { id: dto.toUserId } });
    if (!target || target.status === UserStatus.deleted) {
      throw ApiError.notFound('NOT_FOUND', 'User not found.');
    }
    if (target.status !== UserStatus.active) {
      throw ApiError.forbidden('PROFILE_UNAVAILABLE', 'User isn\'t available right now.');
    }

    // Anchor must belong to the target.
    if (dto.anchorType === LikeAnchorType.photo) {
      if (!dto.anchorPhotoId) throw ApiError.badRequest('ANCHOR_REQUIRED', 'Photo id required.');
      const photo = await this.prisma.photo.findUnique({ where: { id: dto.anchorPhotoId } });
      if (!photo || photo.userId !== dto.toUserId) {
        throw ApiError.badRequest('ANCHOR_INVALID', 'Photo isn\'t this user\'s.');
      }
    } else {
      if (!dto.anchorPromptId) throw ApiError.badRequest('ANCHOR_REQUIRED', 'Prompt id required.');
      const prompt = await this.prisma.profilePrompt.findUnique({
        where: { id: dto.anchorPromptId },
        include: { profile: true },
      });
      if (!prompt || prompt.profile.userId !== dto.toUserId) {
        throw ApiError.badRequest('ANCHOR_INVALID', 'Prompt isn\'t this user\'s.');
      }
    }

    // Idempotency: if we already liked them, return the existing record.
    const existing = await this.prisma.like.findUnique({
      where: { fromUserId_toUserId: { fromUserId, toUserId: dto.toUserId } },
    });
    if (existing) {
      const match = await this.findMatchBetween(fromUserId, dto.toUserId);
      return { matched: !!match, matchId: match?.id ?? null, alreadyLiked: true };
    }

    // A previous pass from this user gets overridden by a like — spec is
    // silent but the UX (heart after skim) implies the pass is forgotten.
    await this.prisma.pass.deleteMany({
      where: { fromUserId, toUserId: dto.toUserId },
    });

    let like;
    try {
      like = await this.prisma.like.create({
        data: {
          fromUserId,
          toUserId: dto.toUserId,
          anchorType: dto.anchorType,
          anchorPhotoId: dto.anchorType === LikeAnchorType.photo ? dto.anchorPhotoId : null,
          anchorPromptId: dto.anchorType === LikeAnchorType.prompt ? dto.anchorPromptId : null,
          comment: dto.comment?.trim() || null,
        },
      });
    } catch (err) {
      // Race: someone else inserted the unique pair in the meantime.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const refound = await this.prisma.like.findUnique({
          where: { fromUserId_toUserId: { fromUserId, toUserId: dto.toUserId } },
        });
        const match = await this.findMatchBetween(fromUserId, dto.toUserId);
        return { matched: !!match, matchId: match?.id ?? null, alreadyLiked: true, like: refound };
      }
      throw err;
    }

    // Does the *other* user already like *us*? → form a match.
    const reciprocal = await this.prisma.like.findUnique({
      where: { fromUserId_toUserId: { fromUserId: dto.toUserId, toUserId: fromUserId } },
    });

    if (!reciprocal) {
      // No match yet — but the recipient should hear about the like.
      const senderProfile = await this.prisma.profile.findUnique({
        where: { userId: fromUserId }, select: { name: true },
      });
      await this.notifications.fanOut(
        dto.toUserId,
        'like.new',
        { likeId: like.id, fromUserId, anchorType: dto.anchorType, hasComment: !!dto.comment },
        {
          prefKey: 'notifyLikes',
          respectQuietHours: true,
          push: {
            title: `${senderProfile?.name ?? 'Someone'} said hey`,
            body: dto.comment ? `"${dto.comment.slice(0, 100)}"` : 'tap to see what they liked',
            data: { type: 'like.new', likeId: like.id, fromUserId },
          },
        },
      ).catch(() => undefined);
      return { matched: false, matchId: null, alreadyLiked: false };
    }

    // Sorted-pair invariant (schema CHECK). Decide which like is A/B by uuid order.
    const [userAId, userBId, likeAId, likeBId] =
      fromUserId < dto.toUserId
        ? [fromUserId, dto.toUserId, like.id, reciprocal.id]
        : [dto.toUserId, fromUserId, reciprocal.id, like.id];

    const match = await this.prisma.match.create({
      data: {
        userAId, userBId,
        likeAId, likeBId,
        status: 'active',
      },
    });

    // Get each side joined to its own match room so subsequent
    // message:new fan-out lands without a reconnect.
    await Promise.all([
      this.realtime.joinMatchForUser(userAId, match.id),
      this.realtime.joinMatchForUser(userBId, match.id),
    ]);

    // Emit "it's a match" to both — each side gets the OTHER profile and
    // a copy of THEIR OWN like (the anchor pinned at the top of the chat).
    const [profileA, profileB] = await Promise.all([
      this.previewProfile(userAId),
      this.previewProfile(userBId),
    ]);
    const likeAFull = await this.fullAnchor(likeAId);
    const likeBFull = await this.fullAnchor(likeBId);

    this.realtime.emitToUser(userAId, 'match:new', {
      match: matchEnvelope(match),
      otherProfile: profileB,
      myAnchor: likeAFull,
    });
    this.realtime.emitToUser(userBId, 'match:new', {
      match: matchEnvelope(match),
      otherProfile: profileA,
      myAnchor: likeBFull,
    });

    // Match fan-out: notification row + push for each side. Each user
    // sees the OTHER person's name in the push.
    const [profileForA, profileForB] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId: userBId }, select: { name: true } }),
      this.prisma.profile.findUnique({ where: { userId: userAId }, select: { name: true } }),
    ]);

    await Promise.all([
      this.notifications.fanOut(userAId, 'match.new',
        { matchId: match.id, otherUserId: userBId },
        {
          prefKey: 'notifyMatches', respectQuietHours: true,
          push: {
            title: 'it\'s a match',
            body: `you and ${profileForA?.name ?? 'someone'} both said hey`,
            data: { type: 'match.new', matchId: match.id },
          },
          skipRealtime: true, // we already emitted `match:new` above
        }),
      this.notifications.fanOut(userBId, 'match.new',
        { matchId: match.id, otherUserId: userAId },
        {
          prefKey: 'notifyMatches', respectQuietHours: true,
          push: {
            title: 'it\'s a match',
            body: `you and ${profileForB?.name ?? 'someone'} both said hey`,
            data: { type: 'match.new', matchId: match.id },
          },
          skipRealtime: true,
        }),
    ]);

    return { matched: true, matchId: match.id, alreadyLiked: false };
  }

  // ── POST /passes ─────────────────────────────────────────────

  async createPass(fromUserId: string, dto: CreatePassDto) {
    if (fromUserId === dto.toUserId) {
      throw ApiError.badRequest('SELF_PASS', 'You can\'t pass on yourself.');
    }
    // Upsert: passing twice is a no-op.
    await this.prisma.pass.upsert({
      where: { fromUserId_toUserId: { fromUserId, toUserId: dto.toUserId } },
      create: { fromUserId, toUserId: dto.toUserId },
      update: {},
    });
    return { ok: true };
  }

  // ── GET /likes/received ──────────────────────────────────────

  async receivedLikes(userId: string) {
    // Likes TO me, minus blocks. "Already responded" (liked back / passed)
    // is filtered app-side below to keep the WHERE simple.
    const rows = await this.prisma.like.findMany({
      where: {
        toUserId: userId,
        fromUser: {
          blocksGiven:    { none: { blockedId: userId } },  // sender hasn't blocked me
          blocksReceived: { none: { blockerId: userId } },  // I haven't blocked sender
        },
      },
      include: {
        fromUser: true,
        anchorPhoto: true,
        anchorPrompt: { include: { prompt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter app-side: exclude senders I've liked back, passed.
    const ids = rows.map((r) => r.fromUserId);
    if (ids.length === 0) return { data: [] };
    const [mineLikes, minePasses] = await Promise.all([
      this.prisma.like.findMany({
        where: { fromUserId: userId, toUserId: { in: ids } },
        select: { toUserId: true },
      }),
      this.prisma.pass.findMany({
        where: { fromUserId: userId, toUserId: { in: ids } },
        select: { toUserId: true },
      }),
    ]);
    const respondedTo = new Set([...mineLikes, ...minePasses].map((r) => r.toUserId));

    const usable = rows.filter((r) => !respondedTo.has(r.fromUserId));

    const data = await Promise.all(
      usable.map(async (r) => {
        // Sender preview (subset of toPublic — name, age, main photo only).
        const preview = await this.previewProfile(r.fromUserId);
        return {
          id: r.id,
          createdAt: r.createdAt.toISOString(),
          anchorType: r.anchorType,
          comment: r.comment,
          anchor: r.anchorType === 'photo' && r.anchorPhoto
            ? {
                kind: 'photo' as const,
                photoId: r.anchorPhoto.id,
                position: r.anchorPhoto.position,
                url: await this.storage.signRead(r.anchorPhoto.s3Key),
              }
            : r.anchorType === 'prompt' && r.anchorPrompt
            ? {
                kind: 'prompt' as const,
                promptId: r.anchorPrompt.id,
                question: r.anchorPrompt.prompt.text,
                answer: r.anchorPrompt.answer,
              }
            : null,
          sender: preview,
        };
      }),
    );

    return { data };
  }

  // ── helpers ──────────────────────────────────────────────────

  private async previewProfile(userId: string) {
    const loaded = await this.shaper.loadFull(userId);
    if (!loaded?.profile) return null;
    const photos = loaded.profile.photos;
    const mainPhoto = photos.find((p) => p.isMain) ?? photos[0];
    return {
      userId,
      name: loaded.profile.name,
      age: loaded.user.dob ? computeAge(loaded.user.dob) : null,
      mainPhotoUrl: mainPhoto ? await this.storage.signRead(mainPhoto.s3Key) : null,
    };
  }

  private async fullAnchor(likeId: string) {
    const like = await this.prisma.like.findUnique({
      where: { id: likeId },
      include: {
        anchorPhoto: true,
        anchorPrompt: { include: { prompt: true } },
      },
    });
    if (!like) return null;
    if (like.anchorType === 'photo' && like.anchorPhoto) {
      return {
        kind: 'photo' as const,
        photoId: like.anchorPhoto.id,
        position: like.anchorPhoto.position,
        url: await this.storage.signRead(like.anchorPhoto.s3Key),
        comment: like.comment,
      };
    }
    if (like.anchorType === 'prompt' && like.anchorPrompt) {
      return {
        kind: 'prompt' as const,
        promptId: like.anchorPrompt.id,
        question: like.anchorPrompt.prompt.text,
        answer: like.anchorPrompt.answer,
        comment: like.comment,
      };
    }
    return null;
  }

  private async findMatchBetween(a: string, b: string) {
    const [low, high] = a < b ? [a, b] : [b, a];
    return this.prisma.match.findFirst({
      where: { userAId: low, userBId: high, status: 'active' },
    });
  }
}

function computeAge(dob: Date): number {
  const t = new Date();
  let age = t.getFullYear() - dob.getFullYear();
  const m = t.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < dob.getDate())) age--;
  return age;
}

function matchEnvelope(match: { id: string; createdAt: Date; userAId: string; userBId: string; status: string }) {
  return {
    id: match.id,
    createdAt: match.createdAt.toISOString(),
    userAId: match.userAId,
    userBId: match.userBId,
    status: match.status,
  };
}
