export class StravaApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'StravaApiError';
  }
}

/** The quota is exhausted: the request must be retried after `retryAt`. */
export class StravaRateLimitedError extends Error {
  constructor(readonly retryAt: Date) {
    super(`Strava rate limit reached, retry after ${retryAt.toISOString()}`);
    this.name = 'StravaRateLimitedError';
  }
}

/** Strava rejected the refresh token: the athlete revoked the access. */
export class StravaAuthorizationRevokedError extends Error {
  constructor() {
    super('Strava authorization was revoked');
    this.name = 'StravaAuthorizationRevokedError';
  }
}
