const QUARTER_HOUR_MS = 15 * 60 * 1000;

interface QuotaWindow {
  usage: number;
  limit: number;
}

export interface Quota {
  fifteenMinutes: QuotaWindow;
  daily: QuotaWindow;
}

/** Strava resets the short quota at :00, :15, :30 and :45. */
export function nextQuarterHour(date: Date): Date {
  return new Date(
    Math.floor(date.getTime() / QUARTER_HOUR_MS) * QUARTER_HOUR_MS +
      QUARTER_HOUR_MS,
  );
}

/** Start of the quarter of an hour holding a date. */
export function quarterStart(date: Date): Date {
  return new Date(nextQuarterHour(date).getTime() - QUARTER_HOUR_MS);
}

/** Strava resets the daily quota at midnight UTC. */
export function nextUtcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
  );
}

/** Parses a `"<15 min>,<daily>"` header pair. */
function parseQuota(limit: string | null, usage: string | null): Quota | null {
  const limits = limit?.split(',').map(Number);
  const usages = usage?.split(',').map(Number);
  if (limits?.length !== 2 || usages?.length !== 2) {
    return null;
  }
  if ([...limits, ...usages].some((value) => !Number.isFinite(value))) {
    return null;
  }
  return {
    fifteenMinutes: { limit: limits[0], usage: usages[0] },
    daily: { limit: limits[1], usage: usages[1] },
  };
}

/**
 * Tracks the application-wide Strava quotas from the headers of each
 * response, so that requests stop before Strava answers 429. The read quota
 * (100 / 15 min, 1,000 / day by default) is the one that matters here.
 */
export class StravaRateLimiter {
  private quotas: Quota[] = [];
  private latest: { overall: Quota | null; read: Quota | null } = {
    overall: null,
    read: null,
  };
  private observedAt: Date | null = null;

  /**
   * @param reserve requests kept free in each window, for interactive calls.
   */
  constructor(
    private readonly reserve = 2,
    private readonly now: () => Date = () => new Date(),
  ) {}

  record(headers: Headers): void {
    const overall = parseQuota(
      headers.get('x-ratelimit-limit'),
      headers.get('x-ratelimit-usage'),
    );
    const read = parseQuota(
      headers.get('x-readratelimit-limit'),
      headers.get('x-readratelimit-usage'),
    );
    const quotas = [overall, read].filter(
      (quota): quota is Quota => quota !== null,
    );
    if (quotas.length > 0) {
      this.quotas = quotas;
      this.latest = { overall, read };
      this.observedAt = this.now();
    }
  }

  /** Date at which a request may be sent again, or null if it may be sent now. */
  blockedUntil(): Date | null {
    const now = this.now();
    if (!this.observedAt) {
      return null;
    }
    const sameDay = nextUtcMidnight(this.observedAt) > now;
    const sameQuarter = nextQuarterHour(this.observedAt) > now;
    const dailyExhausted = this.quotas.some(
      (quota) =>
        sameDay && quota.daily.usage >= quota.daily.limit - this.reserve,
    );
    if (dailyExhausted) {
      return nextUtcMidnight(now);
    }
    const shortExhausted = this.quotas.some(
      (quota) =>
        sameQuarter &&
        quota.fifteenMinutes.usage >= quota.fifteenMinutes.limit - this.reserve,
    );
    return shortExhausted ? nextQuarterHour(now) : null;
  }

  /**
   * Whether less than `share` of each current window is used: background
   * work stops early, leaving the rest of the quota to the synchronization.
   */
  hasCapacity(share: number): boolean {
    if (this.blockedUntil()) {
      return false;
    }
    if (!this.observedAt) {
      return true;
    }
    const now = this.now();
    const sameDay = nextUtcMidnight(this.observedAt) > now;
    const sameQuarter = nextQuarterHour(this.observedAt) > now;
    return this.quotas.every(
      (quota) =>
        (!sameQuarter ||
          quota.fifteenMinutes.usage < quota.fifteenMinutes.limit * share) &&
        (!sameDay || quota.daily.usage < quota.daily.limit * share),
    );
  }

  /** Last observed quotas, for diagnostics. */
  snapshot(): {
    observedAt: Date | null;
    overall: Quota | null;
    read: Quota | null;
  } {
    return { observedAt: this.observedAt, ...this.latest };
  }

  /** When to retry after a 429 response, whose headers were recorded. */
  retryAfterRejection(): Date {
    return this.blockedUntil() ?? nextQuarterHour(this.now());
  }
}
