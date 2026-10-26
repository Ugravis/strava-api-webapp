import { activityDays, localDate, monthlyDistances } from './activity-days';

describe('localDate', () => {
  it('uses the time zone of the start', () => {
    const instant = new Date('2026-03-01T23:30:00Z');
    expect(localDate(instant, 'Europe/Paris')).toBe('2026-03-02');
    expect(localDate(instant, 'America/New_York')).toBe('2026-03-01');
  });

  it('falls back to UTC for a missing or unknown zone', () => {
    const instant = new Date('2026-03-01T23:30:00Z');
    expect(localDate(instant, null)).toBe('2026-03-01');
    expect(localDate(instant, 'Mars/Olympus')).toBe('2026-03-01');
  });
});

describe('activityDays', () => {
  it('sums the activities of each local day, oldest first', () => {
    const activity = (startedAt: string, distanceM: number) => ({
      startedAt: new Date(startedAt),
      timezone: 'Europe/Paris',
      distanceM,
      movingTimeS: 60,
    });
    expect(
      activityDays([
        activity('2026-03-02T08:00:00Z', 5000),
        activity('2026-03-01T23:30:00Z', 1000),
        activity('2026-03-01T08:00:00Z', 2000),
      ]),
    ).toEqual([
      { date: '2026-03-01', count: 1, distanceM: 2000, movingTimeS: 60 },
      { date: '2026-03-02', count: 2, distanceM: 6000, movingTimeS: 120 },
    ]);
  });
});

describe('monthlyDistances', () => {
  it('sums each month by family, empty months included', () => {
    const activity = (
      startedAt: string,
      sportType: 'run' | 'ride',
      distanceM: number,
    ) => ({
      startedAt: new Date(startedAt),
      timezone: 'Europe/Paris',
      sportType,
      distanceM,
    });
    const months = monthlyDistances(
      [
        // Already March in Paris.
        activity('2026-02-28T23:30:00Z', 'run', 1000),
        activity('2026-01-10T08:00:00Z', 'ride', 5000),
      ],
      (sportType) => (sportType === 'run' ? 'run' : 'ride'),
    );
    expect(months.map((month) => [month.month, month.distanceM])).toEqual([
      ['2026-01', 5000],
      ['2026-02', 0],
      ['2026-03', 1000],
    ]);
    expect(months[2].families.run).toBe(1000);
  });
});
