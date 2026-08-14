import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { loadEnv } from '../../../common/config/env';
import { AccessPayload } from '../tokens.service';
import { ApiError } from '../../../common/errors/api-error';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Authenticates `Authorization: Bearer <accessToken>` on every protected
 * route. Beyond JWT signature verification we also re-check the user still
 * exists and isn't banned/deleted, so revocation propagates instantly.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: loadEnv().JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: AccessPayload) {
    if (payload.type !== 'access') {
      throw ApiError.unauthorized('TOKEN_INVALID', 'Wrong token type.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw ApiError.unauthorized('TOKEN_INVALID', 'User no longer exists.');
    }
    if (user.status === 'banned') {
      throw ApiError.forbidden('ACCOUNT_BANNED', 'Account is banned.');
    }
    if (user.status === 'deleted') {
      throw ApiError.forbidden('ACCOUNT_DELETED', 'Account is deleted.');
    }
    return { userId: user.id, status: user.status };
  }
}
