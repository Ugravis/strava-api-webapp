import type { DistanceBySportType } from '../activities/activities.service';
import {
  DISTANCE_FAMILIES,
  FAMILY_SPORT_TYPES,
  type DistanceFamily,
  type DistanceLandmark,
} from './distance-landmarks';

export interface LandmarkProgress extends DistanceLandmark {
  /** Number of times the whole distance was covered. */
  completions: number;
  /** Share of the current iteration already covered, in [0, 1). */
  progress: number;
}

export interface DistancesOverview {
  /** Cumulated distance per family, in meters. */
  totals: Record<DistanceFamily, number>;
  landmarks: LandmarkProgress[];
}

export function familyTotals(
  bySportType: DistanceBySportType,
): Record<DistanceFamily, number> {
  const sum = (distances: (number | undefined)[]): number =>
    distances.reduce<number>((total, distance) => total + (distance ?? 0), 0);
  return Object.fromEntries(
    DISTANCE_FAMILIES.map((family) => [
      family,
      family === 'all'
        ? sum(Object.values(bySportType))
        : sum(FAMILY_SPORT_TYPES[family].map((sport) => bySportType[sport])),
    ]),
  ) as Record<DistanceFamily, number>;
}

export function landmarkProgress(
  landmark: DistanceLandmark,
  totalM: number,
): LandmarkProgress {
  const completions = Math.floor(totalM / landmark.distanceM);
  return {
    ...landmark,
    completions,
    progress: (totalM - completions * landmark.distanceM) / landmark.distanceM,
  };
}

export function distancesOverview(
  landmarks: readonly DistanceLandmark[],
  bySportType: DistanceBySportType,
): DistancesOverview {
  const totals = familyTotals(bySportType);
  return {
    totals,
    landmarks: landmarks.map((landmark) =>
      landmarkProgress(landmark, totals[landmark.family]),
    ),
  };
}
