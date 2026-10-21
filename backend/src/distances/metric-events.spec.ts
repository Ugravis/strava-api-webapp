import type { ActivityTotals } from '../activities/activities.service';
import { activityEvents } from './metric-events';

function activity(id: string, startedAt: string): ActivityTotals {
  return {
    id,
    name: id,
    sportType: 'run',
    startedAt: new Date(startedAt),
    distanceM: 1000,
    movingTimeS: 600,
    elevationGainM: null,
  };
}

const ACTIVITIES = [
  activity('a', '2026-01-01T06:00:00Z'),
  activity('b', '2026-01-01T18:00:00Z'),
  activity('c', '2026-01-02T08:00:00Z'),
];

describe('Metric events', () => {
  it('brings the totals of each activity', () => {
    const values = (metric: Parameters<typeof activityEvents>[0]) =>
      activityEvents(metric, ACTIVITIES).map((event) => event.value);
    expect(values('distance')).toEqual([1000, 1000, 1000]);
    expect(values('time')).toEqual([600, 600, 600]);
    expect(values('elevation')).toEqual([0, 0, 0]);
    expect(values('activities')).toEqual([1, 1, 1]);
  });

  it('counts a day once, on its first activity', () => {
    expect(
      activityEvents('active_days', ACTIVITIES).map((event) => event.value),
    ).toEqual([1, 0, 1]);
  });
});
