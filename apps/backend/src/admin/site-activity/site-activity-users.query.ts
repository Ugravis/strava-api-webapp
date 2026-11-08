import {
  ADMIN_DORMANCY_BUCKETS,
  ADMIN_USER_SEGMENTS,
  type AdminDormancyBucket,
  type AdminHistogramBin,
  type AdminRetention,
  type AdminSiteActivityMeta,
  type AdminSiteActivityUsers,
  type AdminUserSegment,
} from '@kilotrace/shared/admin';
import {
  counted,
  fillDays,
  fillHistogram,
  SIGNUP_DAY,
  type SiteActivityContext,
  type SqlQuery,
} from './site-activity.sql';

type Users = Omit<AdminSiteActivityUsers, keyof AdminSiteActivityMeta>;

/** Months of the distribution of the active days, the current one included. */
const ACTIVE_DAYS_MONTHS = 3;
/** Weeks of the growth accounting and of the cohorts. */
const WEEKS = 12;
const MONTHS = 12;
/** Weeks after the sign-up week followed for each cohort. */
const COHORT_WEEKS = 8;
const CURVE_DAYS = 30;
const TOP_COUNTRIES = 15;

/** Users signed up since the first activity recorded, `$1` today, `$2` the team. */
const COHORT = `
  "cohort" AS (
    SELECT "u"."id", ${SIGNUP_DAY} AS "signup" FROM "users" "u"
    WHERE ${counted('$2')} AND "u"."created_at" >= (SELECT min("day") FROM "user_activity")
  )`;

/** Activity of the users counted: `$2` the team. */
const ACTIVE = `
  "active" AS (
    SELECT "a"."user_id", "a"."day" FROM "user_activity" "a"
    JOIN "users" "u" ON "u"."id" = "a"."user_id" WHERE ${counted('$2')}
  )`;

const retention = (retained: number, eligible: number): AdminRetention => ({
  retained,
  eligible,
});

export async function siteActivityUsers(
  query: SqlQuery,
  { from, today, team, dates }: SiteActivityContext,
): Promise<Users> {
  const [
    activeUsers,
    newVsReturning,
    weekly,
    monthly,
    activeDaysInPeriod,
    activeDays,
    cohorts,
    cohortWeeks,
    curve,
    dormancy,
    streaks,
    segments,
    countries,
  ] = await Promise.all([
    query<{ date: string; dau: number; wau: number; mau: number }>(
      `WITH ${ACTIVE.replaceAll('$2', '$3')}
       SELECT to_char("d"."day", 'YYYY-MM-DD') AS "date",
              count(DISTINCT "a"."user_id") FILTER (WHERE "a"."day" = "d"."day")::int AS "dau",
              count(DISTINCT "a"."user_id") FILTER (WHERE "a"."day" > "d"."day" - 7)::int AS "wau",
              count(DISTINCT "a"."user_id")::int AS "mau"
       FROM (SELECT generate_series($1::date, $2::date, interval '1 day')::date AS "day") AS "d"
       LEFT JOIN "active" "a" ON "a"."day" > "d"."day" - 30 AND "a"."day" <= "d"."day"
       GROUP BY "d"."day" ORDER BY "d"."day"`,
      [from, today, team],
    ),
    query<{ date: string; new: number; returning: number }>(
      `SELECT to_char("a"."day", 'YYYY-MM-DD') AS "date",
              count(*) FILTER (WHERE ${SIGNUP_DAY} = "a"."day")::int AS "new",
              count(*) FILTER (WHERE ${SIGNUP_DAY} < "a"."day")::int AS "returning"
       FROM "user_activity" "a" JOIN "users" "u" ON "u"."id" = "a"."user_id"
       WHERE "a"."day" >= $1::date AND ${counted('$2')}
       GROUP BY "a"."day"`,
      [from, team],
    ),
    // Growth accounting: a week against the one before.
    query<Users['weekly'][number]>(
      `WITH ${ACTIVE}, "weeks" AS (
         SELECT DISTINCT "a"."user_id", date_trunc('week', "a"."day")::date AS "week",
                date_trunc('week', ${SIGNUP_DAY})::date AS "signup_week"
         FROM "active" "a" JOIN "users" "u" ON "u"."id" = "a"."user_id"
       ), "calendar" AS (
         SELECT "w"::date AS "week" FROM generate_series(
           date_trunc('week', $1::date) - interval '${WEEKS - 1} weeks', date_trunc('week', $1::date), interval '1 week'
         ) AS "w"
       )
       SELECT to_char("c"."week", 'YYYY-MM-DD') AS "week",
              count("cur"."user_id")::int AS "active",
              count("cur"."user_id") FILTER (WHERE "cur"."signup_week" = "c"."week")::int AS "new",
              count("cur"."user_id") FILTER (WHERE "prev"."user_id" IS NOT NULL)::int AS "retained",
              count("cur"."user_id") FILTER (
                WHERE "prev"."user_id" IS NULL AND "cur"."signup_week" < "c"."week"
              )::int AS "resurrected",
              (SELECT count(*)::int FROM "weeks" "p" WHERE "p"."week" = "c"."week" - 7
                 AND NOT EXISTS (SELECT 1 FROM "weeks" "n" WHERE "n"."user_id" = "p"."user_id" AND "n"."week" = "c"."week")
              ) AS "churned"
       FROM "calendar" "c"
       LEFT JOIN "weeks" "cur" ON "cur"."week" = "c"."week"
       LEFT JOIN "weeks" "prev" ON "prev"."user_id" = "cur"."user_id" AND "prev"."week" = "c"."week" - 7
       GROUP BY "c"."week" ORDER BY "c"."week"`,
      [today, team],
    ),
    query<Users['monthly'][number]>(
      `WITH ${ACTIVE}, "per_user" AS (
         SELECT date_trunc('month', "day") AS "month", "user_id", count(*) AS "days"
         FROM "active" WHERE "day" >= date_trunc('month', $1::date) - interval '${MONTHS - 1} months'
         GROUP BY 1, 2
       )
       SELECT to_char("month", 'YYYY-MM') AS "month", count(*)::int AS "users", avg("days")::float AS "averageDays"
       FROM "per_user" GROUP BY "month" ORDER BY "month"`,
      [today, team],
    ),
    query<AdminHistogramBin>(
      `WITH ${ACTIVE}, "per_user" AS (
         SELECT "user_id", count(*)::int AS "days" FROM "active" WHERE "day" >= $1::date GROUP BY 1
       )
       SELECT "days" AS "value", count(*)::int AS "count" FROM "per_user" GROUP BY 1`,
      [from, team],
    ),
    query<{ month: string; value: number; count: number }>(
      `WITH ${ACTIVE}, "per_user" AS (
         SELECT date_trunc('month', "day") AS "month", count(*)::int AS "days"
         FROM "active" WHERE "day" >= date_trunc('month', $1::date) - interval '${ACTIVE_DAYS_MONTHS - 1} months'
         GROUP BY 1, "user_id"
       )
       SELECT to_char("month", 'YYYY-MM') AS "month", "days" AS "value", count(*)::int AS "count"
       FROM "per_user" GROUP BY "month", "days" ORDER BY "month", "days"`,
      [today, team],
    ),
    // Cohorts from the first week tracked: the earlier ones were never seen back.
    query<{ week: string; size: number } & Record<string, number>>(
      `WITH ${COHORT}
       SELECT to_char(date_trunc('week', "c"."signup"), 'YYYY-MM-DD') AS "week", count(*)::int AS "size",
              ${[1, 7, 30]
                .map(
                  (n) => `count(*) FILTER (WHERE EXISTS (
                    SELECT 1 FROM "user_activity" "a" WHERE "a"."user_id" = "c"."id" AND "a"."day" = "c"."signup" + ${n}
                  ))::int AS "d${n}",
                  count(*) FILTER (WHERE "c"."signup" + ${n} <= $1::date)::int AS "d${n}_eligible"`,
                )
                .join(',')}
       FROM "cohort" "c"
       WHERE "c"."signup" >= date_trunc('week', $1::date) - interval '${WEEKS - 1} weeks'
       GROUP BY 1 ORDER BY 1`,
      [today, team],
    ),
    query<{ week: string; offset: number; retained: number; eligible: number }>(
      `WITH ${COHORT}, "weeks" AS (
         SELECT "c"."id", date_trunc('week', "c"."signup")::date AS "week", "k" AS "offset"
         FROM "cohort" "c" CROSS JOIN generate_series(1, ${COHORT_WEEKS}) AS "k"
         WHERE "c"."signup" >= date_trunc('week', $1::date) - interval '${WEEKS - 1} weeks'
       )
       SELECT to_char("w"."week", 'YYYY-MM-DD') AS "week", "w"."offset",
              count(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM "user_activity" "a" WHERE "a"."user_id" = "w"."id"
                  AND "a"."day" >= "w"."week" + 7 * "w"."offset" AND "a"."day" < "w"."week" + 7 * ("w"."offset" + 1)
              ))::int AS "retained",
              count(*) FILTER (WHERE "w"."week" + 7 * "w"."offset" <= $1::date)::int AS "eligible"
       FROM "weeks" "w" GROUP BY 1, 2`,
      [today, team],
    ),
    query<{ day: number; classic: number; rolling: number; eligible: number }>(
      `WITH ${COHORT}
       SELECT "n" AS "day",
              count(*) FILTER (WHERE "c"."signup" + "n" <= $1::date)::int AS "eligible",
              count(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM "user_activity" "a" WHERE "a"."user_id" = "c"."id" AND "a"."day" = "c"."signup" + "n"
              ))::int AS "classic",
              count(*) FILTER (WHERE "c"."signup" + "n" <= $1::date AND EXISTS (
                SELECT 1 FROM "user_activity" "a" WHERE "a"."user_id" = "c"."id" AND "a"."day" >= "c"."signup" + "n"
              ))::int AS "rolling"
       FROM "cohort" "c" CROSS JOIN generate_series(0, ${CURVE_DAYS}) AS "n"
       GROUP BY "n" ORDER BY "n"`,
      [today, team],
    ),
    query<{ bucket: AdminDormancyBucket; users: number }>(
      `WITH "latest" AS (
         SELECT $1::date - max("a"."day") AS "idle"
         FROM "users" "u" LEFT JOIN "user_activity" "a" ON "a"."user_id" = "u"."id"
         WHERE ${counted('$2')} GROUP BY "u"."id"
       )
       SELECT CASE
                WHEN "idle" IS NULL THEN 'never'
                WHEN "idle" < 7 THEN '0-6'
                WHEN "idle" < 14 THEN '7-13'
                WHEN "idle" < 30 THEN '14-29'
                WHEN "idle" < 90 THEN '30-89'
                ELSE '90+'
              END AS "bucket",
              count(*)::int AS "users"
       FROM "latest" GROUP BY 1`,
      [today, team],
    ),
    // Runs of consecutive days: a day minus its rank is the same along a run.
    query<AdminHistogramBin>(
      `WITH ${ACTIVE.replaceAll('$2', '$1')}, "runs" AS (
         SELECT "user_id", count(*) AS "length"
         FROM (SELECT "user_id", "day" - (row_number() OVER (PARTITION BY "user_id" ORDER BY "day"))::int AS "run" FROM "active") "r"
         GROUP BY "user_id", "run"
       )
       SELECT "longest"::int AS "value", count(*)::int AS "count"
       FROM (SELECT max("length") AS "longest" FROM "runs" GROUP BY "user_id") "l"
       GROUP BY 1`,
      [team],
    ),
    query<{ segment: AdminUserSegment; total: number; active: number }>(
      `WITH "flags" AS (
         SELECT EXISTS (SELECT 1 FROM "provider_connections" "c" WHERE "c"."user_id" = "u"."id") AS "strava",
                EXISTS (SELECT 1 FROM "oauth_accounts" "o" WHERE "o"."user_id" = "u"."id") AS "google",
                "u"."password_hash" IS NOT NULL AS "password",
                "u"."profile_private" AS "private",
                cardinality("u"."roles") > 0 AS "team",
                EXISTS (SELECT 1 FROM "user_activity" "a" WHERE "a"."user_id" = "u"."id" AND "a"."day" >= $1::date) AS "active"
         FROM "users" "u" WHERE ${counted('$2')}
       )
       SELECT "segment", count(*)::int AS "total", count(*) FILTER (WHERE "active")::int AS "active"
       FROM "flags" CROSS JOIN LATERAL (VALUES
         ('strava', "strava"), ('noStrava', NOT "strava"), ('google', "google"), ('password', "password"),
         ('privateProfile', "private"), ('publicProfile', NOT "private"), ('team', "team")
       ) AS "s"("segment", "member")
       WHERE "member" GROUP BY "segment"`,
      [from, team],
    ),
    query<{ country: string | null; total: number; active: number }>(
      `SELECT "u"."country_code" AS "country", count(*)::int AS "total",
              count(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM "user_activity" "a" WHERE "a"."user_id" = "u"."id" AND "a"."day" >= $1::date
              ))::int AS "active"
       FROM "users" "u" WHERE ${counted('$2')}
       GROUP BY 1 ORDER BY "total" DESC LIMIT ${TOP_COUNTRIES}`,
      [from, team],
    ),
  ]);

  const byBucket = new Map(dormancy.map((row) => [row.bucket, row.users]));
  const bySegment = new Map(segments.map((row) => [row.segment, row]));
  const months = new Map<string, AdminHistogramBin[]>();
  for (const { month, value, count } of activeDays) {
    months.set(month, [...(months.get(month) ?? []), { value, count }]);
  }
  const offsets = new Map(
    cohortWeeks.map((row) => [`${row.week}/${row.offset}`, row]),
  );

  return {
    activeUsers,
    newVsReturning: fillDays(dates, newVsReturning, { new: 0, returning: 0 }),
    weekly,
    monthly,
    activeDaysInPeriod: fillHistogram(activeDaysInPeriod),
    activeDays: [...months].map(([month, distribution]) => ({
      month,
      distribution: fillHistogram(distribution),
    })),
    retention: cohorts.map((row) => ({
      week: row.week,
      size: row.size,
      d1: retention(row.d1, row.d1_eligible),
      d7: retention(row.d7, row.d7_eligible),
      d30: retention(row.d30, row.d30_eligible),
      weeks: Array.from({ length: COHORT_WEEKS }, (_, index) => {
        const cell = offsets.get(`${row.week}/${index + 1}`);
        return retention(cell?.retained ?? 0, cell?.eligible ?? 0);
      }),
    })),
    retentionCurve: curve.map((row) => ({
      day: row.day,
      classic: retention(row.classic, row.eligible),
      rolling: retention(row.rolling, row.eligible),
    })),
    dormancy: ADMIN_DORMANCY_BUCKETS.map((bucket) => ({
      bucket,
      users: byBucket.get(bucket) ?? 0,
    })),
    streaks: fillHistogram(streaks),
    segments: ADMIN_USER_SEGMENTS.map((segment) => ({
      segment,
      total: bySegment.get(segment)?.total ?? 0,
      active: bySegment.get(segment)?.active ?? 0,
    })),
    countries,
  };
}
