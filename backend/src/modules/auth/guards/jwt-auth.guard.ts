import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ApiError } from '../../../common/errors/api-error';

/**
 * Default for the whole app — every route is JWT-guarded unless explicitly
 * `@Public()`. Configured globally in AuthModule so feature modules don't
 * have to repeat `@UseGuards(JwtAuthGuard)` everywhere.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<T = any>(err: any, user: T): T {
    if (err) throw err;
    if (!user) {
      throw ApiError.unauthorized('AUTH_REQUIRED', 'Sign in required.');
    }
    return user;
  }
}
