/**
 * Lightweight in-memory rate limiter (per-process).
 * Suitable for demo / single-instance Vercel serverless warm instances.
 * For multi-instance production, swap to Redis / Upstash.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetTime: number;
  retryAfterSec: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly WINDOW_MS: number;
  private readonly MAX_REQUESTS: number;

  constructor(maxRequests = 15, windowMs = 60_000) {
    this.MAX_REQUESTS = maxRequests;
    this.WINDOW_MS = windowMs;
  }

  /** @returns true if rate limited */
  isRateLimited(identifier: string): boolean {
    return this.check(identifier).limited;
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      const resetTime = now + this.WINDOW_MS;
      this.requests.set(identifier, { count: 1, resetTime });
      return {
        limited: false,
        remaining: this.MAX_REQUESTS - 1,
        resetTime,
        retryAfterSec: 0,
      };
    }

    if (entry.count < this.MAX_REQUESTS) {
      entry.count++;
      return {
        limited: false,
        remaining: this.MAX_REQUESTS - entry.count,
        resetTime: entry.resetTime,
        retryAfterSec: 0,
      };
    }

    return {
      limited: true,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetTime - now) / 1000)),
    };
  }

  getRemaining(identifier: string): { remaining: number; resetTime: number } {
    const r = this.checkPeek(identifier);
    return { remaining: r.remaining, resetTime: r.resetTime };
  }

  /** Peek without incrementing */
  private checkPeek(identifier: string): RateLimitResult {
    const now = Date.now();
    const entry = this.requests.get(identifier);
    if (!entry || now > entry.resetTime) {
      return {
        limited: false,
        remaining: this.MAX_REQUESTS,
        resetTime: now + this.WINDOW_MS,
        retryAfterSec: 0,
      };
    }
    return {
      limited: entry.count >= this.MAX_REQUESTS,
      remaining: Math.max(0, this.MAX_REQUESTS - entry.count),
      resetTime: entry.resetTime,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetTime - now) / 1000)),
    };
  }

  /** Test helper */
  _reset() {
    this.requests.clear();
  }
}

export const rateLimiter = new RateLimiter(15, 60_000);

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'anonymous';
}

/** Build a 429 Response if limited; otherwise null */
export function enforceRateLimit(request: Request): Response | null {
  const ip = getClientIp(request);
  const result = rateLimiter.check(ip);
  if (!result.limited) return null;

  return new Response(
    JSON.stringify({
      error: '请求过于频繁，请稍后再试',
      resetTime: result.resetTime,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSec),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}
