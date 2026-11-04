import type {
  AdminBusinessFigure,
  AdminBusinessMeta,
  AdminBusinessOverview,
} from '@kilotrace/shared/admin';
import { counted } from '../site-activity/site-activity.sql';
import {
  bucketOf,
  type BusinessContext,
  fillSeries,
  seriesOf,
  since,
  type SqlQuery,
} from './business-statistics.sql';

interface Totals {
  new_accounts: number;
  athletes: number;
  activities: number;
  distance_m: number;
  moving_s: number;
  elevation_m: number;
  discoveries: number;
}

/** Figures of `[$1, $2)`, `$3` the team. */
const TOTALS = `
  SELECT
    (SELECT count(*)::int FROM "users" "u"
      WHERE ${counted('$3')} AND ${since('"u"."created_at"', '$1')} AND "u"."created_at" < $2::date) AS "new_accounts",
    "a".*,
    (SELECT coalesce(sum(cardinality("g"."gained_tiles")) / 2, 0)::int
       FROM "activity_gains" "g"
       JOIN "activities" "s" ON "s"."id" = "g"."activity_id"
       JOIN "users" "u" ON "u"."id" = "g"."user_id"
      WHERE ${counted('$3')} AND ${since('"s"."started_at"', '$1')} AND "s"."started_at" < $2::date) AS "discoveries"
  FROM (
    SELECT count(DISTINCT "s"."user_id")::int AS "athletes", count(*)::int AS "activities",
           coalesce(sum("s"."distance_m"), 0)::float AS "distance_m",
           coalesce(sum("s"."moving_time_s"), 0)::float AS "moving_s",
           coalesce(sum("s"."elevation_gain_m"), 0)::float AS "elevation_m"
    FROM "activities" "s" JOIN "users" "u" ON "u"."id" = "s"."user_id"
    WHERE ${counted('$3')} AND ${since('"s"."started_at"', '$1')} AND "s"."started_at" < $2::date
  ) "a"`;

/** The headline figures of the period against the one before. */
export async function businessOverview(
  query: SqlQuery,
  context: BusinessContext,
): Promise<Omit<AdminBusinessOverview, keyof AdminBusinessMeta>> {
  const { from, previousFrom, until, team } = context;
  const series = await seriesOf(
    query,
    context,
    `SELECT least(
       (SELECT min("u"."created_at") FROM "users" "u" WHERE ${counted('$1')}),
       (SELECT min("s"."started_at") FROM "activities" "s" JOIN "users" "u" ON "u"."id" = "s"."user_id" WHERE ${counted('$1')})
     ) AS "earliest"`,
  );
  const [[accounts], [current], previous, activityRows, signupRows] =
    await Promise.all([
      query<{ accounts: number; connected: number }>(
        `SELECT count(*)::int AS "accounts", count("c"."id")::int AS "connected"
         FROM "users" "u" LEFT JOIN "provider_connections" "c" ON "c"."user_id" = "u"."id"
         WHERE ${counted('$1')}`,
        [team],
      ),
      query<Totals>(TOTALS, [from, until, team]),
      previousFrom
        ? query<Totals>(TOTALS, [previousFrom, from, team])
        : Promise.resolve([]),
      query<{
        bucket: string;
        athletes: number;
        activities: number;
        distance_m: number;
      }>(
        `SELECT ${bucketOf('"s"."started_at"', '$1')} AS "bucket", count(DISTINCT "s"."user_id")::int AS "athletes",
                count(*)::int AS "activities", coalesce(sum("s"."distance_m"), 0)::float AS "distance_m"
         FROM "activities" "s" JOIN "users" "u" ON "u"."id" = "s"."user_id"
         WHERE ${counted('$2')} AND "s"."started_at" >= $3::date GROUP BY 1`,
        [series.unit, team, series.buckets[0]],
      ),
      query<{ bucket: string; count: number }>(
        `SELECT ${bucketOf('"u"."created_at"', '$1')} AS "bucket", count(*)::int AS "count"
         FROM "users" "u" WHERE ${counted('$2')} AND "u"."created_at" >= $3::date GROUP BY 1`,
        [series.unit, team, series.buckets[0]],
      ),
    ]);
  const figure = (value: (totals: Totals) => number): AdminBusinessFigure => ({
    current: value(current),
    previous: previous[0] ? value(previous[0]) : null,
  });
  return {
    ...series,
    ...accounts,
    newAccounts: figure((totals) => totals.new_accounts),
    athletes: figure((totals) => totals.athletes),
    activities: figure((totals) => totals.activities),
    distanceM: figure((totals) => totals.distance_m),
    movingS: figure((totals) => totals.moving_s),
    elevationM: figure((totals) => totals.elevation_m),
    discoveries: figure((totals) => totals.discoveries),
    series: {
      accounts: fillSeries(series.buckets, signupRows, (row) => row.count, 0),
      athletes: fillSeries(
        series.buckets,
        activityRows,
        (row) => row.athletes,
        0,
      ),
      activities: fillSeries(
        series.buckets,
        activityRows,
        (row) => row.activities,
        0,
      ),
      distanceM: fillSeries(
        series.buckets,
        activityRows,
        (row) => row.distance_m,
        0,
      ),
    },
  };
}
