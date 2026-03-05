const windows = new Map<string, number[]>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of windows) {
    const fresh = timestamps.filter((t) => now - t < 120_000);
    if (fresh.length === 0) {
      windows.delete(key);
    } else {
      windows.set(key, fresh);
    }
  }
}, 300_000);

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const timestamps = windows.get(key) ?? [];

  // Remove expired entries
  const windowStart = now - windowMs;
  const active = timestamps.filter((t) => t > windowStart);

  if (active.length >= maxRequests) {
    const oldest = active[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  active.push(now);
  windows.set(key, active);
  return { allowed: true };
}
