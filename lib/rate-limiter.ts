/**
 * Lightweight in-memory rate limiter
 * Simple IP-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  
  // Configuration: 15 requests per minute per IP
  private readonly WINDOW_MS = 60000; // 1 minute
  private readonly MAX_REQUESTS = 15;

  /**
   * Check if request is rate limited
   * @param identifier - Usually client IP or other unique identifier
   * @returns true if rate limited
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const entry = this.requests.get(identifier);
    
    if (!entry || now > entry.resetTime) {
      // New window starts
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
      return false;
    }

    if (entry.count < this.MAX_REQUESTS) {
      entry.count++;
      return false;
    }

    // Rate limit exceeded
    return true;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemaining(identifier: string): { remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);
    
    if (!entry || now > entry.resetTime) {
      return { remaining: this.MAX_REQUESTS, resetTime: now + this.WINDOW_MS };
    }
    
    return {
      remaining: Math.max(0, this.MAX_REQUESTS - entry.count),
      resetTime: entry.resetTime,
    };
  }
}

export const rateLimiter = new RateLimiter();
