import {
  nextQuarterHour,
  nextUtcMidnight,
  StravaRateLimiter,
} from './strava-rate-limiter';

function headers(readUsage: string, readLimit = '100,1000'): Headers {
  return new Headers({
    'x-ratelimit-limit': '200,2000',
    'x-ratelimit-usage': '10,100',
    'x-readratelimit-limit': readLimit,
    'x-readratelimit-usage': readUsage,
  });
}

describe('StravaRateLimiter', () => {
  let now: Date;
  let limiter: StravaRateLimiter;

  beforeEach(() => {
    now = new Date('2026-10-15T10:07:00Z');
    limiter = new StravaRateLimiter(2, () => now);
  });

  it('allows requests before any response was observed', () => {
    expect(limiter.blockedUntil()).toBeNull();
  });

  it('allows requests while the quota has room', () => {
    limiter.record(headers('50,400'));
    expect(limiter.blockedUntil()).toBeNull();
  });

  it('waits for the next quarter hour when the 15-minute quota is used', () => {
    limiter.record(headers('98,400'));
    expect(limiter.blockedUntil()).toEqual(new Date('2026-10-15T10:15:00Z'));
  });

  it('forgets the 15-minute usage once its window is over', () => {
    limiter.record(headers('100,400'));
    now = new Date('2026-10-15T10:15:01Z');
    expect(limiter.blockedUntil()).toBeNull();
  });

  it('waits for midnight UTC when the daily quota is used', () => {
    limiter.record(headers('20,999'));
    expect(limiter.blockedUntil()).toEqual(new Date('2026-10-16T00:00:00Z'));
  });

  it('ignores malformed headers', () => {
    limiter.record(headers('oops'));
    limiter.record(new Headers());
    expect(limiter.blockedUntil()).toBeNull();
  });

  it('computes the reset times', () => {
    expect(nextQuarterHour(new Date('2026-10-15T10:45:00Z'))).toEqual(
      new Date('2026-10-15T11:00:00Z'),
    );
    expect(nextUtcMidnight(new Date('2026-10-31T23:59:00Z'))).toEqual(
      new Date('2026-11-01T00:00:00Z'),
    );
  });
});
