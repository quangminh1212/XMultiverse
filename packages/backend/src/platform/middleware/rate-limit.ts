import type { Request, Response, NextFunction } from 'express';
import { HttpError } from './http-error';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Lightweight in-memory rate limiter (no external dependency).
 * Suitable for single-process deployments.
 */
export function rateLimit(
  options: {
    windowMs?: number;
    max?: number;
    keyPrefix?: string;
  } = {},
) {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 120;
  const keyPrefix = options.keyPrefix ?? 'rl';

  return (req: Request, _res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > max) {
      next(HttpError.tooManyRequests(`Rate limit exceeded (${max} req / ${windowMs / 1000}s)`));
      return;
    }
    next();
  };
}

/** Clear buckets — used in tests. */
export function resetRateLimitBuckets(): void {
  buckets.clear();
}
