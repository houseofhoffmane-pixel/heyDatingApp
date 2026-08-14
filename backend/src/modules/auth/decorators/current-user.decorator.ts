import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Injects the user id (sub from the access token) into a controller arg. */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.userId;
  },
);

/** Injects { userId, status }. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
