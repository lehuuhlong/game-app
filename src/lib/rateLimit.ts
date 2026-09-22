/**
 * In-memory sliding window rate limiter.
 * Suitable for single-instance Next.js server deployments.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired entries every 3 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 120_000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 180_000);
}

/**
 * Check if an action is allowed within the sliding window.
 *
 * @param key Unique key (e.g. `ip:endpoint` or `user:endpoint`)
 * @param limit Maximum number of requests allowed in window
 * @param windowMs Window duration in milliseconds (default: 60s)
 */
export function checkRateLimit(
  key: string,
  limit = 15,
  windowMs = 60_000
): { success: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Remove timestamps outside the window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return {
      success: false,
      remaining: 0,
      retryAfter: Math.max(1, retryAfter),
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    remaining: limit - record.timestamps.length,
  };
}

/**
 * Extract client IP from Next.js Request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}
