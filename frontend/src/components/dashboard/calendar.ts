import type { ActivityDay } from "@/lib/api/types";

/** Weeks shown by the calendar of the year, the current one last. */
export const CALENDAR_WEEKS = 53;

const DAY_MS = 24 * 3600 * 1000;

/** Local date of the browser, `YYYY-MM-DD`, as the days of the activities are keyed. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Noon of a local date: whole days apart whatever the daylight saving time. */
export function dateOf(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Monday of the week of `date`, at noon. */
export function weekStart(date: Date): Date {
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  return addDays(noon, -((noon.getDay() + 6) % 7));
}

/** Days of a week from its Monday, with their activities, empty ones included. */
export function weekDays(monday: Date, byDay: ReadonlyMap<string, ActivityDay>): ActivityDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = dayKey(addDays(monday, index));
    return byDay.get(date) ?? { date, count: 0, distanceM: 0, movingTimeS: 0 };
  });
}

export interface PeriodTotals {
  count: number;
  distanceM: number;
  movingTimeS: number;
}

export function totalsOf(days: readonly ActivityDay[]): PeriodTotals {
  return days.reduce(
    (sum, day) => ({
      count: sum.count + day.count,
      distanceM: sum.distanceM + day.distanceM,
      movingTimeS: sum.movingTimeS + day.movingTimeS,
    }),
    { count: 0, distanceM: 0, movingTimeS: 0 },
  );
}

export interface DayStreaks {
  /** Days in a row with an activity up to now; today counts once active, without breaking it before. */
  current: number;
  /** Longest run of active days among the days given. */
  best: number;
}

/** Runs of days with an activity, from the active days (oldest first). */
export function dayStreaks(days: readonly ActivityDay[], today: Date): DayStreaks {
  const active = new Set(days.filter((day) => day.count > 0).map((day) => day.date));

  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of [...active].sort()) {
    run = previous !== null && dayKey(addDays(dateOf(previous), 1)) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }

  // A day without activity yet does not break the streak before it ends.
  let day = dateOf(dayKey(today));
  if (!active.has(dayKey(day))) day = addDays(day, -1);
  let current = 0;
  while (active.has(dayKey(day))) {
    current += 1;
    day = addDays(day, -1);
  }
  return { current, best };
}

/** Average distance of each weekday, Monday first, over the `weeks` weeks before the one starting on `monday`. */
export function weekdayAverages(byDay: ReadonlyMap<string, ActivityDay>, monday: Date, weeks: number): number[] {
  const sums = Array.from({ length: 7 }, () => 0);
  for (let week = 1; week <= weeks; week += 1) {
    weekDays(addDays(monday, -7 * week), byDay).forEach((day, index) => {
      sums[index] += day.distanceM;
    });
  }
  return sums.map((sum) => sum / weeks);
}

/** Distances splitting the active days of the user into four levels of the same size, in meters. */
export type LevelThresholds = [number, number, number];

/** Quartiles of the distances of the active days: the levels follow what the user usually covers. */
export function levelThresholds(days: readonly ActivityDay[]): LevelThresholds {
  const distances = days
    .filter((day) => day.distanceM > 0)
    .map((day) => day.distanceM)
    .sort((a, b) => a - b);
  if (distances.length === 0) return [Infinity, Infinity, Infinity];
  const quantile = (share: number) => distances[Math.min(distances.length - 1, Math.floor(share * distances.length))];
  return [quantile(0.25), quantile(0.5), quantile(0.75)];
}

/** Intensity of a day in the calendar, from 0 (rest) to 4, by distance compared to the usual days of the user. */
export function dayLevel(day: ActivityDay | undefined, thresholds: LevelThresholds): 0 | 1 | 2 | 3 | 4 {
  if (!day || day.count === 0) return 0;
  if (day.distanceM < thresholds[0]) return 1;
  if (day.distanceM < thresholds[1]) return 2;
  if (day.distanceM < thresholds[2]) return 3;
  return 4;
}
