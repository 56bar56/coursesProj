/**
 * Per-key fixed-window limiter, in memory. Good enough for a single API
 * process protecting a free-tier AI quota; would need Redis or similar once
 * the API runs as more than one instance.
 */
export class FixedWindowRateLimiter {
  private readonly windows = new Map<string, { windowStart: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records a hit and returns whether it is allowed. */
  tryConsume(key: string): boolean {
    const now = this.now();
    const entry = this.windows.get(key);
    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.windows.set(key, { windowStart: now, count: 1 });
      this.pruneExpired(now);
      return true;
    }
    if (entry.count >= this.limit) {
      return false;
    }
    entry.count++;
    return true;
  }

  private pruneExpired(now: number) {
    if (this.windows.size < 1000) return;
    for (const [key, entry] of this.windows) {
      if (now - entry.windowStart >= this.windowMs) this.windows.delete(key);
    }
  }
}
