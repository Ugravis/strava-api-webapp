import type { SportType } from '../activities/sport-type';
import {
  DISTANCE_FAMILIES,
  FAMILY_SPORT_TYPES,
  type DistanceFamily,
} from './distance-families';

/** What the progress of a badge needs to know about an event: an activity, or what it brought. */
export interface MetricEvent {
  id: string;
  name: string;
  sportType: SportType;
  startedAt: Date;
  value: number;
}

/** What the progress of a badge needs to know about it. */
export interface BadgeTarget {
  family: DistanceFamily;
  /** Amount of one iteration of a repeatable badge. */
  target: number;
  /**
   * Amounts reaching each tier, ascending, of a badge that is completed only
   * once; null for a repeatable badge.
   */
  tiers?: readonly number[] | null;
}

/** Events of a family, oldest first, with their cumulated amount. */
export interface FamilyTimeline {
  activities: MetricEvent[];
  /** Amount reached up to each event included, in the unit of the metric. */
  cumulated: number[];
}

export interface BadgeProgress {
  /** Number of iterations completed, or of tiers reached. */
  completions: number;
  /**
   * Share of the current iteration, or of the way to the next tier, already
   * done: in [0, 1), or 1 once the last tier is reached.
   */
  progress: number;
  /** Amount counted toward the goal, in the unit of the metric. */
  covered: number;
  /**
   * Amount of the current goal: the iteration, or the next tier (the last
   * one when reached).
   */
  goal: number;
  /** Start of the activity that completed the first iteration or tier. */
  firstCompletedAt: Date | null;
  /** Start of the activity that completed the latest iteration or tier. */
  lastCompletedAt: Date | null;
}

export interface BadgeCompletion {
  /** Iteration completed or tier reached, from 1. */
  iteration: number;
  /** The activity whose distance completed it. */
  activity: Pick<MetricEvent, 'id' | 'name' | 'sportType' | 'startedAt'>;
}

/** Sports counted by a family; null for `all`, which counts every sport. */
function familySports(family: DistanceFamily): readonly SportType[] | null {
  return family === 'all' ? null : FAMILY_SPORT_TYPES[family];
}

/** Splits activities sorted by start into the timeline of each family. */
export function familyTimelines(
  activities: readonly MetricEvent[],
): Record<DistanceFamily, FamilyTimeline> {
  return Object.fromEntries(
    DISTANCE_FAMILIES.map((family) => {
      const sports = familySports(family);
      const selected = sports
        ? activities.filter((activity) => sports.includes(activity.sportType))
        : [...activities];
      let total = 0;
      const cumulated = selected.map((activity) => (total += activity.value));
      return [family, { activities: selected, cumulated }];
    }),
  ) as Record<DistanceFamily, FamilyTimeline>;
}

/** Amount reached by a timeline, in the unit of its metric. */
export function timelineTotal({ cumulated }: FamilyTimeline): number {
  return cumulated.at(-1) ?? 0;
}

/**
 * Index of the first activity bringing the cumulated distance to at least
 * `amount`; the last one when it never does, which rounding errors allow
 * for a distance equal to the total.
 */
export function reachedAt(timeline: FamilyTimeline, amount: number): number {
  let low = 0;
  let high = timeline.cumulated.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (timeline.cumulated[middle] >= amount) high = middle;
    else low = middle + 1;
  }
  return Math.min(low, timeline.cumulated.length - 1);
}

function completionDate(timeline: FamilyTimeline, amount: number): Date | null {
  return timeline.activities[reachedAt(timeline, amount)]?.startedAt ?? null;
}

/** Amount completing the iteration or reaching the tier `index`, from 1; undefined past the last tier. */
function milestone(badge: BadgeTarget, index: number): number | undefined {
  return badge.tiers ? badge.tiers[index - 1] : index * badge.target;
}

function completionsOf(badge: BadgeTarget, total: number): number {
  return badge.tiers
    ? badge.tiers.filter((tier) => tier <= total).length
    : Math.floor(total / badge.target);
}

export function badgeProgress(
  badge: BadgeTarget,
  timeline: FamilyTimeline,
): BadgeProgress {
  const total = timelineTotal(timeline);
  const completions = completionsOf(badge, total);
  const base = completions > 0 ? (milestone(badge, completions) ?? 0) : 0;
  const next = milestone(badge, completions + 1);
  return {
    completions,
    progress: next === undefined ? 1 : (total - base) / (next - base),
    covered: badge.tiers ? total : total - base,
    goal: badge.tiers ? (next ?? base) : badge.target,
    firstCompletedAt:
      completions > 0
        ? completionDate(timeline, milestone(badge, 1) ?? 0)
        : null,
    lastCompletedAt: completions > 0 ? completionDate(timeline, base) : null,
  };
}

/** Completed iterations or reached tiers of a badge, the latest first, from `offset` and at most `limit`. */
export function badgeCompletions(
  badge: BadgeTarget,
  timeline: FamilyTimeline,
  page: { offset: number; limit: number } = { offset: 0, limit: Infinity },
): BadgeCompletion[] {
  const completions = completionsOf(badge, timelineTotal(timeline));
  const length = Math.max(0, Math.min(page.limit, completions - page.offset));
  return Array.from({ length }, (_, index) => {
    const iteration = completions - page.offset - index;
    const { id, name, sportType, startedAt } =
      timeline.activities[
        reachedAt(timeline, milestone(badge, iteration) ?? 0)
      ];
    return { iteration, activity: { id, name, sportType, startedAt } };
  });
}

/** Window over which the recent pace of a family is measured. */
export const RECENT_PACE_DAYS = 90;

const DAY_MS = 86_400_000;

/**
 * When the next iteration would be completed at the pace of the last
 * `RECENT_PACE_DAYS` days; null without any amount over that window, or once the last tier is reached.
 */
export function estimatedNextCompletion(
  badge: BadgeTarget,
  timeline: FamilyTimeline,
  now: Date,
): Date | null {
  const since = now.getTime() - RECENT_PACE_DAYS * DAY_MS;
  const recent = timeline.activities
    .filter((activity) => activity.startedAt.getTime() >= since)
    .reduce((total, activity) => total + activity.value, 0);
  if (recent <= 0) return null;
  const { completions } = badgeProgress(badge, timeline);
  const next = milestone(badge, completions + 1);
  if (next === undefined) return null;
  const remaining = next - timelineTotal(timeline);
  const daily = recent / RECENT_PACE_DAYS;
  return new Date(now.getTime() + (remaining / daily) * DAY_MS);
}
