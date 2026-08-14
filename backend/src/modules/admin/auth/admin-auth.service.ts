import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../../common/errors/api-error';
import { loadEnv } from '../../../common/config/env';
import type { AdminPayload } from './admin-jwt.strategy';

/**
 * Admin sign-in is a simple email + password against `admin_users`. We
 * issue a single short-lived access token (no refresh) — admins re-auth
 * when it expires, no rotation drama.
 */
@Injectable()
export class AdminAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string) {
    const lower = email.toLowerCase();
    const admin = await this.prisma.adminUser.findUnique({ where: { email: lower } });
    if (!admin) throw ApiError.unauthorized('LOGIN_INVALID', 'Email or password is wrong.');
    const ok = await argon2.verify(admin.passwordHash, password);
    if (!ok) throw ApiError.unauthorized('LOGIN_INVALID', 'Email or password is wrong.');

    const env = loadEnv();
    const accessToken = jwt.sign(
      { sub: admin.id, role: admin.role, type: 'admin' } satisfies AdminPayload,
      env.ADMIN_JWT_SECRET,
      { expiresIn: env.ADMIN_JWT_TTL } as jwt.SignOptions,
    );
    const decoded = jwt.decode(accessToken) as jwt.JwtPayload;

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      expiresAt: new Date(((decoded.exp ?? 0)) * 1000).toISOString(),
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    };
  }
}
