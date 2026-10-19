import type { SportType } from '../activities/sport-type';
import {
  DISTANCE_FAMILIES,
  FAMILY_SPORT_TYPES,
  type DistanceFamily,
} from './distance-families';

/** What the progress of a badge needs to know about an activity. */
export interface DistanceActivity {
  id: string;
  name: string;
  sportType: SportType;
  startedAt: Date;
  distanceM: number;
}

/** What the progress of a badge needs to know about it. */
export interface BadgeTarget {
  family: DistanceFamily;
  distanceM: number;
}

/** Activities of a family, oldest first, with their cumulated distance. */
export interface FamilyTimeline {
  activities: DistanceActivity[];
  /** Distance covered up to each activity included, in meters. */
  cumulatedM: number[];
}

export interface BadgeProgress {
  /** Number of times the whole distance was covered. */
  completions: number;
  /** Share of the current iteration already covered, in [0, 1). */
  progress: number;
  /** Start of the activity that completed the first iteration. */
  firstCompletedAt: Date | null;
  /** Start of the activity that completed the latest iteration. */
  lastCompletedAt: Date | null;
}

export interface BadgeCompletion {
  /** Iteration completed, from 1. */
  iteration: number;
  /** The activity whose distance completed it. */
  activity: Pick<DistanceActivity, 'id' | 'name' | 'sportType' | 'startedAt'>;
}

/** Sports counted by a family; null for `all`, which counts every sport. */
function familySports(family: DistanceFamily): readonly SportType[] | null {
  return family === 'all' ? null : FAMILY_SPORT_TYPES[family];
}

/** Splits activities sorted by start into the timeline of each family. */
export function familyTimelines(
  activities: readonly DistanceActivity[],
): Record<DistanceFamily, FamilyTimeline> {
  return Object.fromEntries(
    DISTANCE_FAMILIES.map((family) => {
      const sports = familySports(family);
      const selected = sports
        ? activities.filter((activity) => sports.includes(activity.sportType))
        : [...activities];
      let total = 0;
      const cumulatedM = selected.map(
        (activity) => (total += activity.distanceM),
      );
      return [family, { activities: selected, cumulatedM }];
    }),
  ) as Record<DistanceFamily, FamilyTimeline>;
}

/** Distance covered by a timeline, in meters. */
export function timelineTotal({ cumulatedM }: FamilyTimeline): number {
  return cumulatedM.at(-1) ?? 0;
}

/**
 * Index of the first activity bringing the cumulated distance to at least
 * `distanceM`; the last one when it never does, which rounding errors allow
 * for a distance equal to the total.
 */
export function reachedAt(timeline: FamilyTimeline, distanceM: number): number {
  let low = 0;
  let high = timeline.cumulatedM.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (timeline.cumulatedM[middle] >= distanceM) high = middle;
    else low = middle + 1;
  }
  return Math.min(low, timeline.cumulatedM.length - 1);
}

function completionDate(
  timeline: FamilyTimeline,
  distanceM: number,
): Date | null {
  return timeline.activities[reachedAt(timeline, distanceM)]?.startedAt ?? null;
}

export function badgeProgress(
  badge: BadgeTarget,
  timeline: FamilyTimeline,
): BadgeProgress {
  const totalM = timelineTotal(timeline);
  const completions = Math.floor(totalM / badge.distanceM);
  return {
    completions,
    progress: (totalM - completions * badge.distanceM) / badge.distanceM,
    firstCompletedAt:
      completions > 0 ? completionDate(timeline, badge.distanceM) : null,
    lastCompletedAt:
      completions > 0
        ? completionDate(timeline, completions * badge.distanceM)
        : null,
  };
}

/** Every completed iteration of a badge, the latest first. */
export function badgeCompletions(
  badge: BadgeTarget,
  timeline: FamilyTimeline,
): BadgeCompletion[] {
  const completions = Math.floor(timelineTotal(timeline) / badge.distanceM);
  return Array.from({ length: completions }, (_, index) => {
    const iteration = completions - index;
    const { id, name, sportType, startedAt } =
      timeline.activities[reachedAt(timeline, iteration * badge.distanceM)];
    return { iteration, activity: { id, name, sportType, startedAt } };
  });
}

/** Window over which the recent pace of a family is measured. */
export const RECENT_PACE_DAYS = 90;

const DAY_MS = 86_400_000;

/**
 * When the next iteration would be completed at the pace of the last
 * `RECENT_PACE_DAYS` days; null without any distance over that window.
 */
export function estimatedNextCompletion(
  badge: BadgeTarget,
  timeline: FamilyTimeline,
  now: Date,
): Date | null {
  const since = now.getTime() - RECENT_PACE_DAYS * DAY_MS;
  const recentM = timeline.activities
    .filter((activity) => activity.startedAt.getTime() >= since)
    .reduce((total, activity) => total + activity.distanceM, 0);
  if (recentM <= 0) return null;
  const { progress } = badgeProgress(badge, timeline);
  const remainingM = (1 - progress) * badge.distanceM;
  const dailyM = recentM / RECENT_PACE_DAYS;
  return new Date(now.getTime() + (remainingM / dailyM) * DAY_MS);
}
