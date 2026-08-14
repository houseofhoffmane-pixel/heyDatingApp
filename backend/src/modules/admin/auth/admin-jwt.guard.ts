import { CanActivate, ExecutionContext, Injectable, SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Public } from '../../auth/decorators/public.decorator';
import { ApiError } from '../../../common/errors/api-error';

const ADMIN_ROLE_KEY = 'adminRoleRequired';
/** Tag a route with the minimum required role. Defaults to 'moderator'. */
export const RequireRole = (role: 'admin' | 'moderator') => SetMetadata(ADMIN_ROLE_KEY, role);

@Injectable()
export class AdminJwtGuard extends AuthGuard('admin-jwt') {}

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<'admin' | 'moderator' | undefined>(ADMIN_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest();
    const role = req.user?.role as 'admin' | 'moderator' | undefined;
    if (!role) throw ApiError.unauthorized('AUTH_REQUIRED', 'Admin auth required.');
    if (required === 'admin' && role !== 'admin') {
      throw ApiError.forbidden('FORBIDDEN', 'Admin role required for this action.');
    }
    return true;
  }
}

/**
 * One-stop decorator for every admin route:
 *   @AdminAuth()                  → moderator+
 *   @AdminAuth({ role: 'admin' }) → admin-only
 *
 * Combines @Public() (so the user-JWT global guard skips) with the admin
 * strategy guard and the role check.
 */
export function AdminAuth(opts: { role?: 'admin' | 'moderator' } = {}) {
  return applyDecorators(
    Public(),
    UseGuards(AdminJwtGuard, AdminRoleGuard),
    ...(opts.role ? [RequireRole(opts.role)] : []),
  );
}
