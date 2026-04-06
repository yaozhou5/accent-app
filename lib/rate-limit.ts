// Simple in-memory rate limiter
// Note: Per-instance only. For distributed rate limiting, use Upstash Redis.

const WINDOW_MS = 60 * 60 * 1000; // 60 minutes
const MAX_REQUESTS = 10;

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

// Periodic cleanup
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (entry.resetAt < now) store.delete(key);
      }
    },
    5 * 60 * 1000
  );
}

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    const newEntry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(ip, newEntry);
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: newEntry.resetAt };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.count,
    resetAt: entry.resetAt,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
