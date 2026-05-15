/**
 * Lightweight in-memory rate limiter (A07 — Identification & Auth Failures).
 *
 * Works well for single-instance servers (local dev, single Vercel region).
 * For multi-region production, swap the Map for a Redis/KV store.
 */

interface Bucket {
  count:     number;
  resetAt:   number;
}

const store = new Map<string, Bucket>();

// Prune expired buckets every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    store.forEach((v, k) => { if (v.resetAt < now) store.delete(k); });
  }, 5 * 60 * 1000);
}

interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit:        number;
  /** Window duration in milliseconds */
  windowMs:     number;
  /** Unique key for this rate-limit bucket (e.g. IP + route) */
  key:          string;
}

interface RateLimitResult {
  allowed:    boolean;
  remaining:  number;
  resetAt:    number;
}

export function checkRateLimit({ limit, windowMs, key }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  let bucket = store.get(key);

  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }

  bucket.count += 1;

  return {
    allowed:   bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt:   bucket.resetAt,
  };
}

/**
 * Extract the real client IP from a Next.js Request.
 * Falls back to a fixed string so the limit is per-server (better than nothing).
 */
export function getClientIp(req: Request): string {
  const headers = req instanceof Request ? req.headers : new Headers();
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  );
}
