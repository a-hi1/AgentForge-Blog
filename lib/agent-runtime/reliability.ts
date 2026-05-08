/**
 * Production-Grade Reliability Layer
 * Retry System, Timeout Protection, Circuit Breaker
 */

// ============================================
// 1. Retry System with Exponential Backoff
// ============================================

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: () => true
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function wrapWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxAttempts) {
        break;
      }

      if (!config.shouldRetry(lastError)) {
        break;
      }

      const retryDelay = Math.min(
        config.baseDelay * Math.pow(2, attempt - 1),
        config.maxDelay
      );

      console.log(`[Reliability] Attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
      await delay(retryDelay);
    }
  }

  throw lastError;
}

// ============================================
// 2. Timeout Protection
// ============================================

interface TimeoutOptions {
  timeoutMs?: number;
  fallback?: () => any;
}

const DEFAULT_TIMEOUT = 30000;

export async function wrapWithTimeout<T>(
  fn: () => Promise<T>,
  options: TimeoutOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`Request timeout after ${timeoutMs}ms`));
        });
      })
    ]);
    
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (options.fallback) {
      console.warn('[Reliability] Timeout, using fallback');
      return options.fallback();
    }
    
    throw error;
  }
}

// ============================================
// 3. Circuit Breaker
// ============================================

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenMaxRequests?: number;
}

const DEFAULT_CB_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenMaxRequests: 1
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTimestamp = 0;
  private halfOpenRequestCount = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = { ...DEFAULT_CB_OPTIONS, ...options };
  }

  private transitionTo(state: CircuitState): void {
    if (this.state !== state) {
      console.log(`[CircuitBreaker] State transition: ${this.state} → ${state}`);
      this.state = state;
    }
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenRequestCount = 0;
      this.failureCount = 0;
      this.transitionTo('CLOSED');
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  public recordFailure(): void {
    this.lastFailureTimestamp = Date.now();
    this.failureCount++;

    if (this.state === 'CLOSED' && this.failureCount >= this.options.failureThreshold) {
      this.transitionTo('OPEN');
    } else if (this.state === 'HALF_OPEN') {
      this.halfOpenRequestCount = 0;
      this.transitionTo('OPEN');
    }
  }

  public async execute<T>(
    fn: () => Promise<T>,
    fallback: () => T
  ): Promise<T> {
    // Check if we can transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTimestamp;
      if (timeSinceLastFailure >= this.options.resetTimeout) {
        this.transitionTo('HALF_OPEN');
      }
    }

    // In HALF_OPEN state, allow limited probe requests
    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenRequestCount >= this.options.halfOpenMaxRequests) {
        console.log('[CircuitBreaker] HALF_OPEN - probe limit reached');
        return fallback();
      }
      this.halfOpenRequestCount++;
    }

    // In OPEN state, immediately fallback
    if (this.state === 'OPEN') {
      console.log('[CircuitBreaker] OPEN - falling back');
      return fallback();
    }

    // Normal execution
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      console.warn('[CircuitBreaker] Request failed:', error);
      return fallback();
    }
  }

  public getStats(): {
    state: CircuitState;
    failureCount: number;
    lastFailureTimestamp: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTimestamp: this.lastFailureTimestamp
    };
  }
}

// Global circuit breaker for AI API calls
export const aiApiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000
});
