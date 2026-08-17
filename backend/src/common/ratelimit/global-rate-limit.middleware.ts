import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { RateLimitService } from './ratelimit.service';

/**
 * Per-IP safety net that runs before every request. The per-endpoint
 * limits (OTP, likes, reports, messages) are stricter and hit first;
 * this exists so an unmapped route or a new endpoint added later can't
 * be pounded without any cap at all.
 *
 * 300 requests per IP per minute — well above what a real user's
 * client will produce (typical SPA page load is 10-20 API calls);
 * catches only clear abuse.
 *
 * Skips /health so uptime monitors don't get 429'd.
 */
@Injectable()
export class GlobalRateLimitMiddleware implements NestMiddleware {
  private readonly LIMIT = 300;
  private readonly WINDOW_S = 60;

  constructor(private readonly rl: RateLimitService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Uptime probes and static SPA assets aren't API traffic.
    if (req.path === '/health' || req.path === '/api/v1/health') return next();

    // req.ip works because main.ts sets `trust proxy` — this is the
    // real client, not the reverse proxy.
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const result = await this.rl.hit(`global:${ip}`, this.LIMIT, this.WINDOW_S);

    res.setHeader('X-RateLimit-Limit', this.LIMIT);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, this.LIMIT - result.count));

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfterSeconds);
      throw new HttpException(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' } },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    next();
  }
}
