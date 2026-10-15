import { DISTANCE_LANDMARKS } from './distance-landmarks';
import {
  distancesOverview,
  familyTotals,
  landmarkProgress,
} from './distance-progress';

describe('Distance progress', () => {
  it('sums the distance of each family', () => {
    expect(
      familyTotals({
        run: 10_000,
        virtual_run: 5_000,
        hike: 8_000,
        ride: 40_000,
        e_bike_ride: 30_000,
        swim: 2_000,
      }),
    ).toEqual({
      all: 95_000,
      run: 15_000,
      hike: 8_000,
      ride: 40_000,
    });
  });

  it('gives zero totals without any activity', () => {
    expect(familyTotals({})).toEqual({ all: 0, run: 0, hike: 0, ride: 0 });
  });

  it('counts the completions and the progress of the current iteration', () => {
    const marathon = { id: 'marathon', family: 'run' as const, distanceM: 40 };
    expect(landmarkProgress(marathon, 100)).toMatchObject({
      completions: 2,
      progress: 0.5,
    });
    expect(landmarkProgress(marathon, 80)).toMatchObject({
      completions: 2,
      progress: 0,
    });
    expect(landmarkProgress(marathon, 0)).toMatchObject({
      completions: 0,
      progress: 0,
    });
  });

  it('compares each landmark to the total of its family', () => {
    const overview = distancesOverview(DISTANCE_LANDMARKS, {
      run: 84_390,
      ride: 1_750_000,
    });
    const byId = new Map(overview.landmarks.map((l) => [l.id, l]));

    expect(overview.landmarks).toHaveLength(DISTANCE_LANDMARKS.length);
    expect(byId.get('marathon')).toMatchObject({ completions: 2, progress: 0 });
    expect(byId.get('tour_de_france')).toMatchObject({
      completions: 0,
      progress: 0.5,
    });
    expect(byId.get('gr20')).toMatchObject({ completions: 0, progress: 0 });
    expect(byId.get('earth_center')?.progress).toBeCloseTo(
      1_834_390 / 6_371_000,
    );
  });

  it('declares unique landmark identifiers', () => {
    const ids = DISTANCE_LANDMARKS.map((landmark) => landmark.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
