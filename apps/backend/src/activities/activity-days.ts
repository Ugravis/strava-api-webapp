import type { Activity } from './activity.entity';

/** Activities of one day, in the time zone where each one started. */
export interface ActivityDay {
  /** Local date, `YYYY-MM-DD`. */
  date: string;
  count: number;
  distanceM: number;
  movingTimeS: number;
}

/** Local date of an instant in an IANA time zone; in UTC when the zone is unknown. */
export function localDate(instant: Date, timezone: string | null): string {
  try {
    // The Canadian English format is `YYYY-MM-DD`.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone ?? 'UTC',
    }).format(instant);
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

/** Groups activities by their local date, oldest first. */
export function activityDays(
  activities: Pick<
    Activity,
    'startedAt' | 'timezone' | 'distanceM' | 'movingTimeS'
  >[],
): ActivityDay[] {
  const days = new Map<string, ActivityDay>();
  for (const activity of activities) {
    const date = localDate(activity.startedAt, activity.timezone);
    const day = days.get(date) ?? {
      date,
      count: 0,
      distanceM: 0,
      movingTimeS: 0,
    };
    day.count += 1;
    day.distanceM += activity.distanceM;
    day.movingTimeS += activity.movingTimeS;
    days.set(date, day);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Families of sports followed month by month; `other` gathers the remaining sports. */
export const MONTHLY_FAMILIES = [
  'ride',
  'run',
  'hike',
  'swim',
  'other',
] as const;

export type MonthlyFamily = (typeof MONTHLY_FAMILIES)[number];

/** Distance of one month, in the time zone where each activity started. */
export interface MonthDistance {
  /** Local month, `YYYY-MM`. */
  month: string;
  distanceM: number;
  /** Distance of each family of sports. */
  families: Record<MonthlyFamily, number>;
}

/** The next month of `YYYY-MM`. */
function nextMonth(month: string): string {
  const [year, index] = month.split('-').map(Number);
  return index === 12
    ? `${year + 1}-01`
    : `${year}-${String(index + 1).padStart(2, '0')}`;
}

/**
 * Distance of every month from the first activity to the last one, empty
 * months included, oldest first; `familyOf` names the family of a sport.
 */
export function monthlyDistances(
  activities: Pick<
    Activity,
    'startedAt' | 'timezone' | 'sportType' | 'distanceM'
  >[],
  familyOf: (sportType: Activity['sportType']) => MonthlyFamily,
): MonthDistance[] {
  const months = new Map<string, MonthDistance>();
  const empty = (month: string): MonthDistance => ({
    month,
    distanceM: 0,
    families: { ride: 0, run: 0, hike: 0, swim: 0, other: 0 },
  });
  for (const activity of activities) {
    const month = localDate(activity.startedAt, activity.timezone).slice(0, 7);
    const entry = months.get(month) ?? empty(month);
    entry.distanceM += activity.distanceM;
    entry.families[familyOf(activity.sportType)] += activity.distanceM;
    months.set(month, entry);
  }
  const keys = [...months.keys()].sort();
  if (keys.length === 0) return [];
  const result: MonthDistance[] = [];
  for (
    let month = keys[0];
    month <= keys[keys.length - 1];
    month = nextMonth(month)
  ) {
    result.push(months.get(month) ?? empty(month));
  }
  return result;
}
