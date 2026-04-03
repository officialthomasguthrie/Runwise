type Bucket = { count: number; resetAt: number };

/**
 * In-memory fixed-window rate limiter (single Node instance).
 * Expired keys are removed on each check.
 */
export function createRateLimiter(options: { windowMs: number; maxRequests: number }) {
  const { windowMs, maxRequests } = options;
  const buckets = new Map<string, Bucket>();

  function checkLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();

    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt < now) {
        buckets.delete(key);
      }
    }

    let bucket = buckets.get(identifier);
    if (!bucket) {
      buckets.set(identifier, { count: 1, resetAt: now + windowMs });
      return { allowed: true };
    }

    if (bucket.count >= maxRequests) {
      const retryAfterMs = bucket.resetAt - now;
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    bucket.count += 1;
    return { allowed: true };
  }

  return checkLimit;
}

/** POST /api/wallet/connect — 5 attempts per 15 minutes per user */
export const walletConnectRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});

/** POST /api/wallet/claim-credits — 10 attempts per hour per user */
export const walletClaimCreditsRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
});

/** GET /api/wallet/status — 60 requests per minute per user */
export const walletStatusRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
});
