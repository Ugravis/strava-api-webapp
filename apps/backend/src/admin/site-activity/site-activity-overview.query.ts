import type {
  AdminSiteActivityMeta,
  AdminSiteActivityOverview,
  AdminSiteActivityTotals,
} from '@kilotrace/shared/admin';
import {
  counted,
  SIGNUP_DAY,
  sessionsSql,
  type SiteActivityContext,
  type SqlQuery,
} from './site-activity.sql';

type Overview = Omit<AdminSiteActivityOverview, keyof AdminSiteActivityMeta>;

interface TotalsRow extends AdminSiteActivityTotals {
  pages: number;
  bounces: number;
}

/** Figures of `[$1, $2)`, `$3` the team. */
const totalsSql = `
  WITH ${sessionsSql('$1', '$3')}
  SELECT
    (SELECT count(DISTINCT "a"."user_id")::int FROM "user_activity" "a" JOIN "users" "u" ON "u"."id" = "a"."user_id"
       WHERE "a"."day" >= $1::date AND "a"."day" < $2::date AND ${counted('$3')}) AS "activeUsers",
    (SELECT count(*)::int FROM "users" "u"
       WHERE ${SIGNUP_DAY} >= $1::date AND ${SIGNUP_DAY} < $2::date AND ${counted('$3')}) AS "newUsers",
    (SELECT count(*)::int FROM "views" WHERE "at" < $2::date) AS "views",
    (SELECT coalesce(sum("duration_ms"), 0)::float FROM "views" WHERE "at" < $2::date) AS "visibleMs",
    (SELECT count(*)::int FROM "sessions" WHERE "start" < $2::date) AS "sessions",
    (SELECT coalesce(sum("pages"), 0)::int FROM "sessions" WHERE "start" < $2::date) AS "pages",
    (SELECT count(*)::int FROM "sessions" WHERE "start" < $2::date AND "pages" = 1) AS "bounces"`;

export async function siteActivityOverview(
  query: SqlQuery,
  context: SiteActivityContext,
): Promise<Overview> {
  const { from, previousFrom, today, until, team } = context;
  const [[users], [current], [previous], [stickiness]] = await Promise.all([
    query<{ users: number }>(
      `SELECT count(*)::int AS "users" FROM "users" "u" WHERE ${counted('$1')}`,
      [team],
    ),
    query<TotalsRow>(totalsSql, [from, until, team]),
    query<TotalsRow>(totalsSql, [previousFrom, from, team]),
    // Average over the days of the period of DAU / MAU.
    query<{ value: number | null }>(
      `WITH "active" AS (
         SELECT "a"."user_id", "a"."day" FROM "user_activity" "a"
         JOIN "users" "u" ON "u"."id" = "a"."user_id"
         WHERE "a"."day" > $1::date - 30 AND ${counted('$3')}
       ), "daily" AS (
         SELECT count(DISTINCT "a"."user_id") FILTER (WHERE "a"."day" = "d"."day")::float
                / nullif(count(DISTINCT "a"."user_id"), 0) AS "ratio"
         FROM generate_series($1::date, $2::date, interval '1 day') AS "d"("day")
         JOIN "active" "a" ON "a"."day" > "d"."day"::date - 30 AND "a"."day" <= "d"."day"
         GROUP BY "d"."day"
       )
       SELECT avg("ratio")::float AS "value" FROM "daily"`,
      [from, today, team],
    ),
  ]);
  return {
    users: users.users,
    current: strip(current),
    previous: strip(previous),
    stickiness: stickiness.value,
    averageSessionMs: current.sessions
      ? current.visibleMs / current.sessions
      : null,
    pagesPerSession: current.sessions ? current.pages / current.sessions : null,
    bounceRate: current.sessions ? current.bounces / current.sessions : null,
  };
}

const strip = (row: TotalsRow): AdminSiteActivityTotals => ({
  activeUsers: row.activeUsers,
  newUsers: row.newUsers,
  views: row.views,
  sessions: row.sessions,
  visibleMs: row.visibleMs,
});
