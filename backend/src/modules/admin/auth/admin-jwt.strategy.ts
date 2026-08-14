import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../../common/errors/api-error';
import { loadEnv } from '../../../common/config/env';

export interface AdminPayload {
  sub: string;            // admin id
  role: 'admin' | 'moderator';
  type: 'admin';
  iat?: number;
  exp?: number;
}

/**
 * Separate Passport strategy for the admin surface — signed with
 * ADMIN_JWT_SECRET so a stolen *user* access token can never authenticate
 * against /admin/*, and vice versa. The strategy name 'admin-jwt' is what
 * AdminJwtGuard targets via `AuthGuard('admin-jwt')`.
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: loadEnv().ADMIN_JWT_SECRET,
    });
  }

  async validate(payload: AdminPayload) {
    if (payload.type !== 'admin') {
      throw ApiError.unauthorized('TOKEN_INVALID', 'Wrong token type.');
    }
    const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin) {
      throw ApiError.unauthorized('TOKEN_INVALID', 'Admin no longer exists.');
    }
    // Use the DB role over the token claim — role changes propagate instantly.
    return { adminId: admin.id, email: admin.email, role: admin.role };
  }
}
