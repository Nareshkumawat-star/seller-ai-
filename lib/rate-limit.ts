/**
 * Small fixed-window limiter. Good enough for a single Node instance (Render web
 * service, local dev). Serverless/multi-instance deployments need a shared store.
 */
type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();
const MAX_KEYS = 5_000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(key: string, limitPerMinute: number, now = Date.now()): RateLimitResult {
  if (buckets.size > MAX_KEYS) {
    for (const [bucketKey, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const windowMs = 60_000;
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limitPerMinute - 1, retryAfterSeconds: 60 };
  }

  entry.count += 1;
  if (entry.count > limitPerMinute) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, remaining: limitPerMinute - entry.count, retryAfterSeconds: 0 };
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip || request.headers.get("x-real-ip") || "local";
}

/** Test helper. */
export function resetRateLimits(): void {
  buckets.clear();
}
