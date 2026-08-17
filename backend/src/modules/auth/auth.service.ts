import { Inject, Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimitService } from '../../common/ratelimit/ratelimit.service';
import { ApiError } from '../../common/errors/api-error';
import { loadEnv } from '../../common/config/env';
import { OTP_PROVIDER, OtpProvider } from './providers/otp.provider';
import { TokensService, IssuedTokens } from './tokens.service';
import { toUserPublic, UserPublic } from './dto/user-public.dto';

// Failed-verify lockout window. After 5 wrong codes the phone is locked
// for 15 minutes — matches §8 scenario 3.
const OTP_FAIL_MAX = 5;
const OTP_FAIL_WINDOW_S = 15 * 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly rateLimit: RateLimitService,
    @Inject(OTP_PROVIDER) private readonly otp: OtpProvider,
  ) {}

  // ── OTP request ───────────────────────────────────────────────

  async otpRequest(phoneE164: string, ctx: { ip?: string }) {
    const normalized = normalizePhone(phoneE164);
    const env = loadEnv();

    // Per-phone send quota.
    const rlPhone = await this.rateLimit.hit(
      `otp:send:phone:${normalized.e164}`,
      env.RL_OTP_PER_HOUR,
      60 * 60,
    );
    if (!rlPhone.allowed) {
      throw ApiError.tooManyRequests(
        'OTP_RATE_LIMITED',
        'Too many code requests. Try again later.',
        rlPhone.retryAfterSeconds,
      );
    }

    // Per-IP send quota (basic abuse guard).
    if (ctx.ip) {
      const rlIp = await this.rateLimit.hit(
        `otp:send:ip:${ctx.ip}`,
        env.RL_OTP_PER_HOUR * 4,
        60 * 60,
      );
      if (!rlIp.allowed) {
        throw ApiError.tooManyRequests('OTP_RATE_LIMITED', 'Too many code requests.', rlIp.retryAfterSeconds);
      }
    }

    await this.otp.send(normalized.e164);
    return { sent: true, retryAfterSeconds: 24 };
  }

  // ── OTP verify ────────────────────────────────────────────────

  async otpVerify(
    phoneE164: string,
    code: string,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<{ accessToken: string; refreshToken: string; user: UserPublic; isNewUser: boolean } & Omit<IssuedTokens, 'accessToken' | 'refreshToken'>> {
    const normalized = normalizePhone(phoneE164);

    // Refuse before counting if already locked out.
    const lockoutKey = `otp:fail:${normalized.e164}`;
    const peek = await this.rateLimit.peek(lockoutKey);
    if (peek.count >= OTP_FAIL_MAX) {
      throw ApiError.tooManyRequests(
        'OTP_LOCKED',
        'Too many wrong codes. Try again later.',
        peek.ttlSeconds,
      );
    }

    const ok = await this.otp.check(normalized.e164, code);

    // Log every attempt (audit + analytics).
    const phoneOnly = normalized.e164;
    await this.prisma.otpAttempt.create({
      data: {
        phoneE164: phoneOnly,
        success: ok,
        ip: ctx.ip,
      },
    });

    if (!ok) {
      const failed = await this.rateLimit.hit(lockoutKey, OTP_FAIL_MAX + 100, OTP_FAIL_WINDOW_S);
      if (failed.count >= OTP_FAIL_MAX) {
        throw ApiError.tooManyRequests(
          'OTP_LOCKED',
          'Too many wrong codes. Try again later.',
          failed.retryAfterSeconds,
        );
      }
      throw ApiError.unauthorized('OTP_INVALID', "That code didn't match.");
    }

    // Success — clear failure counter, find-or-create user, mint tokens.
    await this.rateLimit.reset(lockoutKey);

    const { user, isNewUser } = await this.findOrCreateUser(normalized.e164, normalized.countryCode);
    const issued = await this.tokens.issueForUser(user.id, ctx);

    // Bump last_active_at on successful auth.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    return {
      ...issued,
      user: toUserPublic(user),
      isNewUser,
    };
  }

  // ── Email + password SIGN UP (phone-free path) ────────────────

  /**
   * Creates a fresh account from just email + password. Skips the
   * phone/OTP flow entirely — used while SMS providers are stubbed.
   * User lands in `onboarding` status; walks the 15-step flow to
   * become `active`.
   *
   * Phone becomes a synthesised placeholder we can't collide on —
   * the DB still requires phoneE164 as UNIQUE NOT NULL. When SMS
   * ships later, an "add phone" onboarding step can overwrite it.
   */
  async signupEmail(email: string, password: string, ctx: { ip?: string; userAgent?: string }) {
    const normalisedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalisedEmail)) {
      throw ApiError.badRequest('EMAIL_INVALID', 'That doesn\'t look like an email.', 'email');
    }
    if (password.length < 8) {
      throw ApiError.badRequest('PASSWORD_WEAK', 'Password must be 8+ characters.', 'password');
    }

    // Explicit try around each DB touch so a Prisma failure surfaces as
    // a clean typed error instead of a bare 500 in the client.
    let existing;
    try {
      existing = await this.prisma.user.findUnique({ where: { email: normalisedEmail } });
    } catch (e: any) {
      throw ApiError.internal(
        'DB_UNREACHABLE',
        `Database unreachable during signup — likely misconfigured DB env or Remote MySQL not enabled. (${e?.message?.slice(0, 120) ?? 'unknown'})`,
      );
    }
    if (existing) {
      throw ApiError.conflict('EMAIL_TAKEN', 'An account with that email already exists. Try logging in.');
    }

    const passwordHash = await argon2.hash(password);
    // Synthesised phone: unique per user, marked so we know it's a
    // placeholder. When phone auth ships, overwrite via a profile PATCH.
    // Format: +999<epoch>  → always starts with '+999' which no real
    // country uses, so we can grep for placeholders later.
    const placeholderPhone = `+999${Date.now()}`;

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email: normalisedEmail,
          passwordHash,
          phoneE164: placeholderPhone,
          countryCode: 'XX',
          status: 'onboarding',
          visibility: 'everyone',
          ageConfirmed: false,
          lastActiveAt: new Date(),
        },
      });
    } catch (e: any) {
      // P2002 = unique constraint (email race, or placeholder phone collision).
      if (e?.code === 'P2002') {
        throw ApiError.conflict('EMAIL_TAKEN', 'Account with that email already exists.');
      }
      throw ApiError.internal(
        'DB_WRITE_FAILED',
        `Could not create account — ${e?.message?.slice(0, 120) ?? 'unknown DB error'}`,
      );
    }

    const issued = await this.tokens.issueForUser(user.id, ctx);
    return { ...issued, user: toUserPublic(user), isNewUser: true };
  }

  // ── Email + password LOGIN (returning user) ───────────────────

  async loginEmail(email: string, password: string, ctx: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !user.passwordHash) {
      throw ApiError.unauthorized('LOGIN_INVALID', 'Email or password is wrong.');
    }
    if (user.status === 'banned' || user.status === 'deleted') {
      throw ApiError.forbidden('ACCOUNT_DISABLED', 'This account is not available.');
    }

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      throw ApiError.unauthorized('LOGIN_INVALID', 'Email or password is wrong.');
    }

    const issued = await this.tokens.issueForUser(user.id, ctx);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });
    return { ...issued, user: toUserPublic(user) };
  }

  // ── Refresh + logout ─────────────────────────────────────────

  async refresh(refreshToken: string, ctx: { ip?: string; userAgent?: string }) {
    return this.tokens.rotate(refreshToken, ctx);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.tokens.revokeOne(refreshToken);
    } else {
      await this.tokens.revokeAllForUser(userId);
    }
    return { ok: true };
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrCreateUser(phoneE164: string, countryCode: string) {
    const existing = await this.prisma.user.findUnique({ where: { phoneE164 } });
    if (existing) {
      if (existing.status === 'banned') {
        throw ApiError.forbidden('ACCOUNT_BANNED', 'This account is banned.');
      }
      if (existing.status === 'deleted' && existing.deletedAt) {
        // Spec §10: 30-day purge window. If they sign in within the window,
        // resurrect into onboarding — they reclaim the account.
        const purgeAfterMs = loadEnv().ACCOUNT_PURGE_DAYS * 24 * 60 * 60 * 1000;
        if (Date.now() - existing.deletedAt.getTime() > purgeAfterMs) {
          throw ApiError.forbidden('ACCOUNT_PURGED', 'This account is no longer available.');
        }
        const restored = await this.prisma.user.update({
          where: { id: existing.id },
          data: { status: 'onboarding', deletedAt: null },
        });
        return { user: restored, isNewUser: false };
      }
      return { user: existing, isNewUser: false };
    }

    const created = await this.prisma.user.create({
      data: {
        phoneE164,
        countryCode,
        status: 'onboarding',
        visibility: 'everyone',
        ageConfirmed: false,
        lastActiveAt: new Date(),
      },
    });
    return { user: created, isNewUser: true };
  }
}

/**
 * Parse + re-format an incoming phone string. Throws 422 if invalid. The
 * normalised E.164 is the canonical login identity, so this gatekeeps
 * everything downstream.
 */
function normalizePhone(input: string): { e164: string; countryCode: string } {
  const parsed = parsePhoneNumberFromString(input);
  if (!parsed || !parsed.isValid()) {
    throw ApiError.unprocessable('PHONE_INVALID', 'Phone number is not valid.', 'phone_e164');
  }
  return {
    e164: parsed.number,
    countryCode: `+${parsed.countryCallingCode}`,
  };
}
