import { Injectable } from '@nestjs/common';
import { LinkedProvider, Prisma, UserStatus, Visibility } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { ProfileShaper } from '../../common/profile/profile-shaper';
import { TokensService } from '../auth/tokens.service';
import { CheckinService } from '../places/checkin.service';
import { PatchProfileDto } from '../onboarding/dto/patch-profile.dto';
import { OnboardingService } from '../onboarding/onboarding.service';
import { PutSettingsDto } from './dto/put-settings.dto';
import { AccountStatusDto } from './dto/account-status.dto';
import { PutEmergencyContactDto } from './dto/emergency-contact.dto';
import { ConnectLinkedAccountDto } from './dto/linked-account.dto';

/**
 * Catch-all for self-management endpoints. Split by concern internally
 * (account, settings, emergency contact, linked accounts, profile edits)
 * but exposed under one service so the controller stays slim.
 */
@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shaper: ProfileShaper,
    private readonly tokens: TokensService,
    private readonly onboarding: OnboardingService,
    private readonly checkins: CheckinService,
  ) {}

  // ── GET /me ──────────────────────────────────────────────────

  async me(userId: string) {
    const loaded = await this.shaper.loadFull(userId);
    if (!loaded) throw ApiError.notFound('USER_NOT_FOUND', 'User not found.');
    return this.shaper.toOwner({ user: loaded.user, profile: loaded.profile });
  }

  // ── PATCH /me/profile ────────────────────────────────────────

  /**
   * Same DTO as onboarding's PATCH. We re-use the onboarding service so
   * the validation rules (age ≥ 18, completion %) stay consistent.
   * Clearing an optional field is done by sending an empty string for
   * strings or null for enum/int.
   */
  async patchProfile(userId: string, dto: PatchProfileDto) {
    return this.onboarding.patchProfile(userId, dto);
  }

  // ── GET / PUT /settings ──────────────────────────────────────

  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { visibility: true },
    });
    if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'User not found.');

    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return { ...settings, visibility: user.visibility };
  }

  async putSettings(userId: string, dto: PutSettingsDto) {
    if (
      dto.quietHoursStart !== undefined && dto.quietHoursEnd !== undefined &&
      dto.quietHoursStart !== null && dto.quietHoursEnd !== null &&
      dto.quietHoursStart === dto.quietHoursEnd
    ) {
      throw ApiError.badRequest('QUIET_HOURS_INVALID', 'quietHoursStart and end can\'t be the same.');
    }

    const userPatch: { visibility?: Visibility } = {};
    if (dto.visibility !== undefined) userPatch.visibility = dto.visibility;
    if (Object.keys(userPatch).length > 0) {
      await this.prisma.user.update({ where: { id: userId }, data: userPatch });
    }

    const settingsPatch: Prisma.UserSettingsUpdateInput = {};
    for (const key of [
      'notifyMatches', 'notifyMessages', 'notifyLikes', 'notifyPlaces', 'notifyEvents', 'notifyNews',
      'emailDigest', 'readReceipts', 'activeStatus', 'blurExplicit', 'showMeOnPlaces',
    ] as const) {
      if (dto[key] !== undefined) (settingsPatch as any)[key] = dto[key];
    }
    if (dto.quietHoursStart !== undefined) settingsPatch.quietHoursStart = dto.quietHoursStart;
    if (dto.quietHoursEnd !== undefined)   settingsPatch.quietHoursEnd   = dto.quietHoursEnd;

    await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...(settingsPatch as any) },
      update: settingsPatch,
    });

    return this.getSettings(userId);
  }

  // ── PUT /account/status ──────────────────────────────────────

  async setAccountStatus(userId: string, dto: AccountStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'User not found.');

    // Refuse status changes if the account is banned/deleted.
    if (user.status === UserStatus.banned || user.status === UserStatus.deleted) {
      throw ApiError.forbidden('ACCOUNT_DISABLED', 'Account is not modifiable.');
    }

    // 'active' is only allowed from paused/hidden (not from onboarding/pending_verification).
    if (dto.status === 'active' && user.status !== UserStatus.paused && user.status !== UserStatus.hidden) {
      throw ApiError.badRequest('INVALID_TRANSITION', 'You can only resume from paused or hidden.');
    }

    let autoResumeAt: Date | null = null;
    if (dto.status !== 'active' && dto.autoResumeAt) {
      autoResumeAt = new Date(dto.autoResumeAt);
      if (Number.isNaN(autoResumeAt.getTime()) || autoResumeAt.getTime() <= Date.now()) {
        throw ApiError.badRequest('AUTO_RESUME_INVALID', 'autoResumeAt must be a future ISO timestamp.');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: dto.status as UserStatus,
        autoResumeAt: dto.status === 'active' ? null : autoResumeAt,
      },
    });

    // Hidden = drop all active checkins so the spot rosters lose the user.
    if (dto.status === 'hidden') {
      await this.silentLeaveAll(userId);
    }

    return { ok: true, status: dto.status };
  }

  // ── DELETE /account (soft-delete) ────────────────────────────

  async deleteAccount(userId: string) {
    // Soft-delete: status=deleted + deleted_at set. The account-purge cron
    // hard-deletes after `ACCOUNT_PURGE_DAYS`.
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.deleted, deletedAt: new Date() },
    });

    // Revoke every refresh token so existing sessions die immediately.
    await this.tokens.revokeAllForUser(userId);

    // Active checkins → leave so spot rosters update right now.
    await this.silentLeaveAll(userId);

    // End every active match. Other party sees "user unavailable".
    await this.prisma.match.updateMany({
      where: {
        status: 'active',
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      data: { status: 'unmatched', unmatchedBy: userId },
    });

    return { ok: true, status: 'deleted' };
  }

  // ── /emergency-contact ───────────────────────────────────────

  async getEmergencyContact(userId: string) {
    const row = await this.prisma.emergencyContact.findUnique({ where: { userId } });
    return row ? {
      id: row.id,
      name: row.name,
      phoneE164: row.phoneE164,
      autoShareFirstDate: row.autoShareFirstDate,
      checkinTimer: row.checkinTimer,
    } : null;
  }

  async putEmergencyContact(userId: string, dto: PutEmergencyContactDto) {
    const row = await this.prisma.emergencyContact.upsert({
      where: { userId },
      create: {
        userId,
        name: dto.name.trim(),
        phoneE164: dto.phoneE164,
        autoShareFirstDate: dto.autoShareFirstDate ?? false,
        checkinTimer: dto.checkinTimer ?? false,
      },
      update: {
        name: dto.name.trim(),
        phoneE164: dto.phoneE164,
        ...(dto.autoShareFirstDate !== undefined ? { autoShareFirstDate: dto.autoShareFirstDate } : {}),
        ...(dto.checkinTimer !== undefined ? { checkinTimer: dto.checkinTimer } : {}),
      },
    });
    return { id: row.id, name: row.name, phoneE164: row.phoneE164 };
  }

  async deleteEmergencyContact(userId: string) {
    await this.prisma.emergencyContact.deleteMany({ where: { userId } });
    return { ok: true };
  }

  // ── /linked-accounts ─────────────────────────────────────────

  async connectLinkedAccount(userId: string, provider: string, dto: ConnectLinkedAccountDto) {
    if (provider !== 'instagram' && provider !== 'spotify') {
      throw ApiError.badRequest('PROVIDER_INVALID', 'Unsupported provider.');
    }
    const row = await this.prisma.linkedAccount.upsert({
      where: { userId_provider: { userId, provider: provider as LinkedProvider } },
      create: {
        userId,
        provider: provider as LinkedProvider,
        handle: dto.handle,
        data: dto.data as Prisma.InputJsonValue,
      },
      update: {
        handle: dto.handle,
        data: dto.data as Prisma.InputJsonValue,
      },
    });
    return {
      provider: row.provider,
      handle: row.handle,
      connectedAt: row.connectedAt.toISOString(),
    };
  }

  async disconnectLinkedAccount(userId: string, provider: string) {
    await this.prisma.linkedAccount.deleteMany({
      where: { userId, provider: provider as LinkedProvider },
    });
    return { ok: true };
  }

  // ── shared helper ────────────────────────────────────────────

  private async silentLeaveAll(userId: string) {
    const active = await this.prisma.checkin.findMany({
      where: { userId, leftAt: null },
      select: { placeId: true, eventId: true },
    });
    await Promise.all(active.map(async (c) => {
      if (c.placeId) await this.checkins.leavePlace(userId, c.placeId).catch(() => undefined);
      if (c.eventId) await this.checkins.leaveEvent(userId, c.eventId).catch(() => undefined);
    }));
  }
}
