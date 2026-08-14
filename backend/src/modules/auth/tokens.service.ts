import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { loadEnv } from '../../common/config/env';
import { ApiError } from '../../common/errors/api-error';

export interface AccessPayload {
  sub: string;            // user id
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshPayload {
  sub: string;
  jti: string;            // unique id; matches refresh_tokens.id
  family: string;         // rotation family
  type: 'refresh';
  iat?: number;
  exp?: number;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
}

/**
 * Manages JWT issuance and the refresh-token rotation family.
 *
 * Rotation rules:
 *   - Every refresh exchange revokes the presented token and issues a new
 *     access + refresh pair, keeping the same `family` id.
 *   - If a *revoked* refresh is presented, we revoke the whole family —
 *     classic token-reuse detection. The thief and the victim both get
 *     kicked, the user signs in fresh.
 *
 * Hashing: only sha256(token) is stored. The signed JWT itself is the bearer
 * proof, so it must never be at rest. Hashing makes a DB leak useless.
 */
@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── public ──────────────────────────────────────────────────

  async issueForUser(userId: string, opts: { userAgent?: string; ip?: string } = {}): Promise<IssuedTokens> {
    // family id is a UUID — refresh_tokens.family is text but keeping the
    // shape consistent with row IDs makes joins/inspection easier.
    const family = randomUUID();
    return this.mintPair(userId, family, null, opts);
  }

  async rotate(
    presentedRefreshToken: string,
    opts: { userAgent?: string; ip?: string } = {},
  ): Promise<IssuedTokens> {
    const env = loadEnv();
    let payload: RefreshPayload;
    try {
      payload = jwt.verify(presentedRefreshToken, env.JWT_REFRESH_SECRET) as RefreshPayload;
    } catch {
      throw ApiError.unauthorized('REFRESH_INVALID', 'Refresh token is invalid or expired.');
    }
    if (payload.type !== 'refresh') {
      throw ApiError.unauthorized('REFRESH_INVALID', 'Wrong token type.');
    }

    const tokenHash = sha256(presentedRefreshToken);
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    // Unknown hash — could be a forgery. Reject hard.
    if (!row) {
      throw ApiError.unauthorized('REFRESH_INVALID', 'Refresh token not recognised.');
    }

    // Already-revoked token presented → assume the chain is compromised,
    // revoke the entire family.
    if (row.revokedAt) {
      await this.revokeFamily(row.family);
      this.logger.warn(`refresh-reuse detected; revoked family=${row.family} user=${row.userId}`);
      throw ApiError.unauthorized('REFRESH_REUSED', 'Refresh token already used. Please sign in again.');
    }

    if (row.expiresAt.getTime() <= Date.now()) {
      throw ApiError.unauthorized('REFRESH_EXPIRED', 'Refresh token expired.');
    }

    // Mark this token revoked and chain a fresh one in the same family.
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    return this.mintPair(row.userId, row.family, row.id, opts);
  }

  async revokeOne(refreshToken: string): Promise<void> {
    const tokenHash = sha256(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  verifyAccessToken(token: string): AccessPayload {
    const env = loadEnv();
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
      if (payload.type !== 'access') {
        throw ApiError.unauthorized('TOKEN_INVALID', 'Wrong token type.');
      }
      return payload;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw ApiError.unauthorized('TOKEN_INVALID', 'Access token invalid or expired.');
    }
  }

  // ── internals ───────────────────────────────────────────────

  private async revokeFamily(family: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async mintPair(
    userId: string,
    family: string,
    parentId: string | null,
    opts: { userAgent?: string; ip?: string },
  ): Promise<IssuedTokens> {
    const env = loadEnv();

    // Access token — short, stateless. No DB row.
    const accessToken = jwt.sign(
      { sub: userId, type: 'access' } satisfies AccessPayload,
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_TTL } as jwt.SignOptions,
    );
    const accessDecoded = jwt.decode(accessToken) as jwt.JwtPayload;

    // Refresh token — long, stored hashed for rotation.
    // jti is a UUID so it matches the refresh_tokens.id column (uuid).
    const refreshJti = randomUUID();
    const refreshToken = jwt.sign(
      { sub: userId, jti: refreshJti, family, type: 'refresh' } satisfies RefreshPayload,
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_TTL } as jwt.SignOptions,
    );
    const refreshDecoded = jwt.decode(refreshToken) as jwt.JwtPayload;
    const refreshExp = new Date((refreshDecoded.exp ?? Math.floor(Date.now() / 1000)) * 1000);

    await this.prisma.refreshToken.create({
      data: {
        id: refreshJti,
        userId,
        tokenHash: sha256(refreshToken),
        family,
        parentId: parentId ?? undefined,
        userAgent: opts.userAgent,
        ip: opts.ip,
        expiresAt: refreshExp,
      },
    });

    return {
      accessToken,
      refreshToken,
      accessExpiresAt: new Date((accessDecoded.exp ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      refreshExpiresAt: refreshExp.toISOString(),
    };
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
