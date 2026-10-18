/**
 * Per-user sliding-window rate limit for expensive endpoints (pipeline runs).
 * In-process only: each serverless instance keeps its own window, so this is
 * a speed bump, not a guarantee. Credits are the real cost cap.
 * TODO(WS4): move to a shared store (e.g. Upstash Redis or a Postgres table) for production.
 */
const windows = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const hits = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    windows.set(key, hits);
    return { ok: false, retryAfterMs: windowMs - (now - hits[0]) };
  }
  hits.push(now);
  windows.set(key, hits);
  return { ok: true, retryAfterMs: 0 };
}
