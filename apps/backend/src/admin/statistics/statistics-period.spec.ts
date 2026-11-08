import { quarterStart } from '../../strava/api/strava-rate-limiter';
import { periodDays } from './statistics-period';

describe('periodDays', () => {
  it('lists the UTC midnights of the period, today last', () => {
    const days = periodDays(new Date('2026-03-02T23:30:00Z'), 3);

    expect(days.map((day) => day.toISOString())).toEqual([
      '2026-02-28T00:00:00.000Z',
      '2026-03-01T00:00:00.000Z',
      '2026-03-02T00:00:00.000Z',
    ]);
  });
});

describe('quarterStart', () => {
  it('rounds down to the quarter of an hour', () => {
    expect(quarterStart(new Date('2026-03-02T10:44:59Z')).toISOString()).toBe(
      '2026-03-02T10:30:00.000Z',
    );
    expect(quarterStart(new Date('2026-03-02T10:45:00Z')).toISOString()).toBe(
      '2026-03-02T10:45:00.000Z',
    );
  });
});
