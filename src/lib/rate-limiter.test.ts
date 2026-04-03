/**
 * Phase 6B verification (TOKEN_HOLDER_IMPLEMENTATION.md):
 * 1. GET /api/wallet/status — 60/min; 61st should be rate-limited (429 in production).
 * 2. POST /api/wallet/connect — 5 per 15m; 6th should be rate-limited.
 *
 * These tests use fresh limiter instances with the same window/max as the wallet routes.
 */
import { describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from '@/lib/rate-limiter';

/** Mirrors `walletStatusRateLimit` in rate-limiter.ts */
const STATUS_WINDOW_MS = 60_000;
const STATUS_MAX = 60;

/** Mirrors `walletConnectRateLimit` in rate-limiter.ts */
const CONNECT_WINDOW_MS = 15 * 60 * 1000;
const CONNECT_MAX = 5;

describe('Phase 6B — wallet rate limits', () => {
  it('status: first 60 requests allowed, 61st blocked with retryAfter (seconds)', () => {
    const checkLimit = createRateLimiter({ windowMs: STATUS_WINDOW_MS, maxRequests: STATUS_MAX });
    const userId = 'phase6b-status-user';

    for (let i = 1; i <= STATUS_MAX; i++) {
      const r = checkLimit(userId);
      expect(r.allowed, `request ${i}/${STATUS_MAX}`).toBe(true);
    }

    const blocked = checkLimit(userId);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeDefined();
    expect(blocked.retryAfter!).toBeGreaterThanOrEqual(1);
    expect(blocked.retryAfter!).toBeLessThanOrEqual(60);
  });

  it('connect: first 5 requests allowed, 6th blocked with retryAfter', () => {
    const checkLimit = createRateLimiter({ windowMs: CONNECT_WINDOW_MS, maxRequests: CONNECT_MAX });
    const userId = 'phase6b-connect-user';

    for (let i = 1; i <= CONNECT_MAX; i++) {
      const r = checkLimit(userId);
      expect(r.allowed, `request ${i}/${CONNECT_MAX}`).toBe(true);
    }

    const blocked = checkLimit(userId);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeDefined();
    expect(blocked.retryAfter!).toBeGreaterThanOrEqual(1);
    // Within 15-minute window
    expect(blocked.retryAfter!).toBeLessThanOrEqual(15 * 60);
  });

  it('expired window: after resetAt, counter starts fresh', () => {
    vi.useFakeTimers();
    const checkLimit = createRateLimiter({ windowMs: 10_000, maxRequests: 2 });
    const userId = 'phase6b-expiry-user';

    expect(checkLimit(userId).allowed).toBe(true);
    expect(checkLimit(userId).allowed).toBe(true);
    expect(checkLimit(userId).allowed).toBe(false);

    vi.advanceTimersByTime(10_001);
    expect(checkLimit(userId).allowed).toBe(true);

    vi.useRealTimers();
  });
});
