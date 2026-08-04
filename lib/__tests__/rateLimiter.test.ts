import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimiter } from '../rate-limiter';

describe('rateLimiter', () => {
  beforeEach(() => {
    rateLimiter._reset();
  });

  it('allows first N requests', () => {
    for (let i = 0; i < 15; i++) {
      assert.equal(rateLimiter.isRateLimited('test-ip'), false);
    }
  });

  it('blocks after exceeding window quota', () => {
    for (let i = 0; i < 15; i++) rateLimiter.isRateLimited('burst-ip');
    assert.equal(rateLimiter.isRateLimited('burst-ip'), true);
  });

  it('isolates identifiers', () => {
    for (let i = 0; i < 15; i++) rateLimiter.isRateLimited('a');
    assert.equal(rateLimiter.isRateLimited('a'), true);
    assert.equal(rateLimiter.isRateLimited('b'), false);
  });
});
