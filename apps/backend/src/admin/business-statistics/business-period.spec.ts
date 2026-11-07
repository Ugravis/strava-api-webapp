import { periodSeries, periodStart } from './business-period';

describe('business period', () => {
  const now = new Date('2026-11-04T10:00:00Z');

  it('counts the days of a period, today included', () => {
    expect(periodStart('30', now)).toEqual({
      from: '2026-10-06',
      previousFrom: '2026-09-06',
    });
    expect(periodStart('all', now)).toEqual({ from: null, previousFrom: null });
  });

  it('reads 30 days day by day', () => {
    const { unit, buckets } = periodSeries('30', now, null);
    expect(unit).toBe('day');
    expect(buckets).toHaveLength(30);
    expect(buckets.at(-1)).toBe('2026-11-04');
  });

  it('starts the weeks on Monday, the first one before the period', () => {
    const { unit, buckets } = periodSeries('90', now, null);
    expect(unit).toBe('week');
    expect(buckets[0]).toBe('2026-08-03');
    expect(buckets.at(-1)).toBe('2026-11-02');
  });

  it('reads a year month by month', () => {
    const { unit, buckets } = periodSeries('365', now, null);
    expect(unit).toBe('month');
    expect(buckets[0]).toBe('2025-11-01');
    expect(buckets).toHaveLength(13);
  });

  it('reads the whole history by month, then by year when long', () => {
    expect(periodSeries('all', now, new Date('2026-10-17')).buckets).toEqual([
      '2026-10-01',
      '2026-11-01',
    ]);
    const long = periodSeries('all', now, new Date('2014-03-01'));
    expect(long.unit).toBe('year');
    expect(long.buckets[0]).toBe('2014-01-01');
    expect(long.buckets).toHaveLength(13);
  });

  it('has a point for today without any figure', () => {
    expect(periodSeries('all', now, null).buckets).toEqual(['2026-11-01']);
  });
});
