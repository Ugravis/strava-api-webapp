import type {
  AdminSiteActivityFunnel,
  AdminSiteActivityFunnelSteps,
  AdminSiteActivityMeta,
} from '@kilotrace/shared/admin';
import {
  counted,
  SIGNUP_DAY,
  type SiteActivityContext,
  type SqlQuery,
} from './site-activity.sql';

type Funnel = Omit<AdminSiteActivityFunnel, keyof AdminSiteActivityMeta>;

const COHORT_WEEKS = 12;

/**
 * When each user reached each step, `$1` the team. A revoked Strava access
 * deletes its connection: the user goes back to the sign-up. The map visit
 * is only known since the tracking began, and for 90 days.
 */
const STEPS = `
  "steps" AS (
    SELECT "u"."created_at" AS "signed_up", ${SIGNUP_DAY} AS "signup",
           "c"."created_at" AS "connected",
           CASE WHEN "c"."id" IS NOT NULL THEN coalesce(
             (SELECT min("j"."finished_at") FROM "sync_jobs" "j" WHERE "j"."connection_id" = "c"."id" AND "j"."status" = 'completed'),
             "c"."last_synced_at"
           ) END AS "synced",
           (SELECT min("p"."at") FROM "page_views" "p" WHERE "p"."user_id" = "u"."id" AND "p"."path" = '/map') AS "map"
    FROM "users" "u"
    LEFT JOIN "provider_connections" "c" ON "c"."user_id" = "u"."id"
    WHERE ${counted('$1')}
  )`;

/** Each step among those who reached the steps before. */
const COUNTS = `count(*)::int AS "signedUp",
  count("connected")::int AS "stravaConnected",
  count("synced")::int AS "firstSync",
  count("map") FILTER (WHERE "synced" IS NOT NULL)::int AS "mapVisited"`;

const medianDays = (step: string) =>
  `(percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM ${step} - "signed_up") / 86400))::float`;

export async function siteActivityFunnel(
  query: SqlQuery,
  { today, team }: SiteActivityContext,
): Promise<Funnel> {
  const [[steps], [medians], cohorts] = await Promise.all([
    query<AdminSiteActivityFunnelSteps>(
      `WITH ${STEPS} SELECT ${COUNTS} FROM "steps"`,
      [team],
    ),
    query<Funnel['medianDays']>(
      `WITH ${STEPS}
       SELECT ${medianDays('"connected"')} AS "stravaConnected", ${medianDays('"synced"')} AS "firstSync",
              ${medianDays('"map"')} AS "mapVisited"
       FROM "steps"`,
      [team],
    ),
    query<Funnel['cohorts'][number]>(
      `WITH ${STEPS}
       SELECT to_char(date_trunc('week', "signup"), 'YYYY-MM-DD') AS "week", ${COUNTS}
       FROM "steps" WHERE "signup" >= date_trunc('week', $2::date) - interval '${COHORT_WEEKS - 1} weeks'
       GROUP BY 1 ORDER BY 1`,
      [team, today],
    ),
  ]);
  return { steps, medianDays: medians, cohorts };
}
