// In-memory simple rate limiter for API routes.
//
// NOTE ON SERVERLESS: this Map lives in the memory of a single serverless
// function instance. On Vercel, concurrent traffic can be served by several
// warm instances at once, each with its own independent counter, so this
// limiter is a best-effort per-instance guard, not a hard global limit. For a
// hard global limit across all instances, back this with a shared store
// (e.g. Upstash Redis / @upstash/ratelimit) instead of the in-memory Map.
const ipRequestCounts = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS_PER_WINDOW = 10;

/**
 * Extracts a single, stable client identifier from a request.
 *
 * `x-forwarded-for` can contain a comma-separated chain
 * ("client, proxy1, proxy2") — using the raw header as the map key means
 * every request that includes the same proxy chain (or every request where
 * the header is simply absent, e.g. direct/local traffic) collapses onto the
 * SAME bucket. In practice that means unrelated visitors share one 60-req/min
 * allowance and legitimate users get 429s that look like "the AI ran out
 * too early." Always take just the first (left-most / original client) IP.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export function checkRateLimit(ip: string, maxRequests = DEFAULT_MAX_REQUESTS_PER_WINDOW): boolean {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);

  if (!record) {
    ipRequestCounts.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (now - record.timestamp > RATE_LIMIT_WINDOW_MS) {
    // Reset window
    ipRequestCounts.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}
