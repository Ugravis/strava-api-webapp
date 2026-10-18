import type { SportType } from '../activities/sport-type';
import {
  badgeCompletions,
  badgeProgress,
  type DistanceActivity,
  estimatedNextCompletion,
  familyTimelines,
  reachedAt,
  timelineTotal,
} from './distance-progress';

const DAY_MS = 86_400_000;

function activity(
  id: string,
  sportType: SportType,
  day: string,
  distanceM: number,
): DistanceActivity {
  return {
    id,
    name: `Activity ${id}`,
    sportType,
    startedAt: new Date(`${day}T08:00:00Z`),
    distanceM,
  };
}

const ACTIVITIES = [
  activity('a', 'run', '2026-01-01', 10_000),
  activity('b', 'ride', '2026-01-02', 40_000),
  activity('c', 'virtual_run', '2026-01-03', 5_000),
  activity('d', 'e_bike_ride', '2026-01-04', 30_000),
  activity('e', 'trail_run', '2026-01-05', 25_000),
  activity('f', 'hike', '2026-01-06', 8_000),
];

describe('Distance progress', () => {
  const timelines = familyTimelines(ACTIVITIES);

  it('sums the distance of each family', () => {
    expect(timelineTotal(timelines.all)).toBe(118_000);
    expect(timelineTotal(timelines.run)).toBe(40_000);
    expect(timelineTotal(timelines.hike)).toBe(8_000);
    expect(timelineTotal(timelines.ride)).toBe(40_000);
  });

  it('gives empty timelines without any activity', () => {
    const empty = familyTimelines([]);
    expect(timelineTotal(empty.all)).toBe(0);
    expect(badgeProgress({ family: 'run', distanceM: 40 }, empty.run)).toEqual({
      completions: 0,
      progress: 0,
      firstCompletedAt: null,
      lastCompletedAt: null,
    });
  });

  it('finds the activity reaching a distance', () => {
    expect(reachedAt(timelines.run, 1)).toBe(0);
    expect(reachedAt(timelines.run, 10_000)).toBe(0);
    expect(reachedAt(timelines.run, 10_001)).toBe(1);
    expect(reachedAt(timelines.run, 40_000)).toBe(2);
  });

  it('counts the completions and dates the first and the latest', () => {
    const badge = { family: 'run' as const, distanceM: 12_000 };
    expect(badgeProgress(badge, timelines.run)).toEqual({
      completions: 3,
      progress: 4_000 / 12_000,
      firstCompletedAt: ACTIVITIES[2].startedAt,
      lastCompletedAt: ACTIVITIES[4].startedAt,
    });
  });

  it('completes an iteration exactly at the total', () => {
    const badge = { family: 'run' as const, distanceM: 20_000 };
    expect(badgeProgress(badge, timelines.run)).toMatchObject({
      completions: 2,
      progress: 0,
      lastCompletedAt: ACTIVITIES[4].startedAt,
    });
  });

  it('lists every completion, the latest first', () => {
    const badge = { family: 'run' as const, distanceM: 12_000 };
    expect(
      badgeCompletions(badge, timelines.run).map(({ iteration, activity }) => [
        iteration,
        activity.id,
      ]),
    ).toEqual([
      [3, 'e'],
      [2, 'e'],
      [1, 'c'],
    ]);
  });

  it('estimates the next completion at the recent pace', () => {
    const badge = { family: 'run' as const, distanceM: 50_000 };
    const now = new Date('2026-01-10T08:00:00Z');
    // 40 km over 90 days, 10 km left.
    expect(estimatedNextCompletion(badge, timelines.run, now)).toEqual(
      new Date(now.getTime() + (10_000 / (40_000 / 90)) * DAY_MS),
    );
  });

  it('gives no estimate without recent activity', () => {
    const badge = { family: 'run' as const, distanceM: 50_000 };
    expect(
      estimatedNextCompletion(
        badge,
        timelines.run,
        new Date('2027-01-01T00:00:00Z'),
      ),
    ).toBeNull();
  });
});
