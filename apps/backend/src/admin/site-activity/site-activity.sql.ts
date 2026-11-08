import type { AdminSiteActivityPeriod } from '@kilotrace/shared/admin';

/** Runs one SQL statement with its parameters. */
export type SqlQuery = <T>(sql: string, params: unknown[]) => Promise<T[]>;

/** The period asked for, days in UTC `YYYY-MM-DD`. */
export interface SiteActivityContext {
  days: AdminSiteActivityPeriod;
  /** First day of the period. */
  from: string;
  /** First day of the period before, as long. */
  previousFrom: string;
  today: string;
  /** The day after today: the end of the period, excluded. */
  until: string;
  team: boolean;
  /** Whether the views of the back-office pages are counted. */
  admin: boolean;
  /** Each day of the period, oldest first. */
  dates: string[];
}

/** A session ends after that long without a page opened. */
export const SESSION_GAP_MINUTES = 30;

/** Users counted, the parameter telling whether the team is. */
export const counted = (team: string) =>
  `(${team}::boolean OR cardinality("u"."roles") = 0)`;

/** Sign-up day of a user, in UTC. */
export const SIGNUP_DAY = `("u"."created_at" AT TIME ZONE 'UTC')::date`;

/** UTC day and hour of a page view. */
export const viewDay = (at: string) => `(${at} AT TIME ZONE 'UTC')::date`;

/** Path of a back-office page. */
export const ADMIN_PATH = `'/admin%'`;

/**
 * Page views `"p"` counted: all, or those outside the back office. A
 * literal of the code, never of the request.
 */
export const viewed = (admin: boolean) =>
  admin ? 'TRUE' : `"p"."path" NOT LIKE ${ADMIN_PATH}`;

/** Bucket of a duration in milliseconds, as `ADMIN_DURATION_BUCKETS`. */
export const durationBucketSql = (ms: string) => `CASE
  WHEN ${ms} < 5000 THEN '<5s'
  WHEN ${ms} < 15000 THEN '5-15s'
  WHEN ${ms} < 30000 THEN '15-30s'
  WHEN ${ms} < 60000 THEN '30-60s'
  WHEN ${ms} < 180000 THEN '1-3min'
  WHEN ${ms} < 600000 THEN '3-10min'
  WHEN ${ms} < 1800000 THEN '10-30min'
  ELSE '30min+'
END`;

/**
 * `"views"`: the page views counted since `from`, each with the number of
 * its session and its rank in it; `"sessions"`: one row per session.
 */
export const sessionsSql = (from: string, team: string, admin: boolean) => `
  "ordered" AS (
    SELECT "p"."id", "p"."user_id", "p"."path", "p"."at", "p"."device", "p"."duration_ms",
           CASE WHEN lag("p"."at") OVER "w" IS NULL
                  OR "p"."at" - lag("p"."at" + "p"."duration_ms" * interval '1 millisecond') OVER "w"
                     > interval '${SESSION_GAP_MINUTES} minutes'
                THEN 1 ELSE 0 END AS "starts"
    FROM "page_views" "p" JOIN "users" "u" ON "u"."id" = "p"."user_id"
    WHERE "p"."at" >= ${from}::date AND ${counted(team)} AND ${viewed(admin)}
    WINDOW "w" AS (PARTITION BY "p"."user_id" ORDER BY "p"."at")
  ), "views" AS (
    SELECT *, sum("starts") OVER (PARTITION BY "user_id" ORDER BY "at", "id") AS "session"
    FROM "ordered"
  ), "sessions" AS (
    SELECT "user_id", "session", min("at") AS "start", count(*)::int AS "pages",
           sum("duration_ms")::bigint AS "visible_ms",
           (array_agg("path" ORDER BY "at"))[1] AS "entry",
           (array_agg("path" ORDER BY "at" DESC))[1] AS "exit"
    FROM "views" GROUP BY "user_id", "session"
  )`;

/** Fills the missing values of a whole-number histogram, from `min` to its highest value. */
export function fillHistogram(
  rows: { value: number; count: number }[],
  min = 1,
): { value: number; count: number }[] {
  const byValue = new Map(rows.map((row) => [row.value, row.count]));
  const max = Math.max(min, ...rows.map((row) => row.value));
  return Array.from({ length: max - min + 1 }, (_, index) => ({
    value: min + index,
    count: byValue.get(min + index) ?? 0,
  }));
}

/** Days of `dates` in order, each with the values of its row or zeros. */
export function fillDays<T extends { date: string }>(
  dates: string[],
  rows: T[],
  empty: Omit<T, 'date'>,
): T[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  return dates.map((date) => byDate.get(date) ?? ({ date, ...empty } as T));
}
