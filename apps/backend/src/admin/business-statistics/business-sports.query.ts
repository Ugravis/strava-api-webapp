import {
  ADMIN_ATHLETE_LOAD_BUCKETS,
  ADMIN_DISTANCE_BUCKETS,
  type AdminBusinessBucket,
  type AdminSportFamily,
  type AdminBusinessMeta,
  type AdminBusinessSports,
} from '@kilotrace/shared/admin';
import { counted } from '../site-activity/site-activity.sql';
import {
  bucketOf,
  type BusinessContext,
  emptyFamilies,
  familySql,
  fillBuckets,
  fillSeries,
  seriesOf,
  since,
  type SqlQuery,
} from './business-statistics.sql';

const SPORTS_SHOWN = 12;

/** Activities counted, `s` joined to its user; `$1` the team, `$2` the start. */
const COUNTED = `"activities" "s" JOIN "users" "u" ON "u"."id" = "s"."user_id"
  WHERE ${counted('$1')} AND ${since('"s"."started_at"', '$2')}`;

/** What is practiced, how much, when: every figure by the date of the activities. */
export async function businessSports(
  query: SqlQuery,
  context: BusinessContext,
): Promise<Omit<AdminBusinessSports, keyof AdminBusinessMeta>> {
  const { from, team } = context;
  const series = await seriesOf(
    query,
    context,
    `SELECT min("s"."started_at") AS "earliest" FROM "activities" "s" JOIN "users" "u" ON "u"."id" = "s"."user_id" WHERE ${counted('$1')}`,
  );
  const params = [team, from];
  const seriesParams = [team, series.buckets[0], series.unit];
  const [
    perFamily,
    athletes,
    [totals],
    sports,
    week,
    distances,
    load,
    [kinds],
  ] = await Promise.all([
    query<{
      bucket: string;
      family: AdminSportFamily;
      activities: number;
      distance_m: number;
    }>(
      `SELECT ${bucketOf('"s"."started_at"', '$3')} AS "bucket", ${familySql('"s"."sport_type"')} AS "family",
                count(*)::int AS "activities", coalesce(sum("s"."distance_m"), 0)::float AS "distance_m"
         FROM ${COUNTED} GROUP BY 1, 2`,
      seriesParams,
    ),
    query<{ bucket: string; count: number }>(
      `SELECT ${bucketOf('"s"."started_at"', '$3')} AS "bucket", count(DISTINCT "s"."user_id")::int AS "count"
         FROM ${COUNTED} GROUP BY 1`,
      seriesParams,
    ),
    query<AdminBusinessSports['totals']>(
      `SELECT count(*)::int AS "activities", count(DISTINCT "s"."user_id")::int AS "athletes",
                coalesce(sum("s"."distance_m"), 0)::float AS "distanceM",
                coalesce(sum("s"."moving_time_s"), 0)::float AS "movingS",
                coalesce(sum("s"."elevation_gain_m"), 0)::float AS "elevationM",
                (percentile_cont(0.5) WITHIN GROUP (ORDER BY "s"."distance_m"))::float AS "medianDistanceM"
         FROM ${COUNTED}`,
      params,
    ),
    query<AdminBusinessSports['sports'][number]>(
      `SELECT lower("s"."sport_type") AS "sport", count(*)::int AS "activities",
                count(DISTINCT "s"."user_id")::int AS "athletes",
                coalesce(sum("s"."distance_m"), 0)::float AS "distanceM",
                coalesce(sum("s"."moving_time_s"), 0)::float AS "movingS",
                coalesce(sum("s"."elevation_gain_m"), 0)::float AS "elevationM"
         FROM ${COUNTED} GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT ${SPORTS_SHOWN}`,
      params,
    ),
    query<AdminBusinessSports['week'][number]>(
      `SELECT extract(isodow FROM "local")::int AS "weekday", extract(hour FROM "local")::int AS "hour", count(*)::int AS "views"
         FROM (
           SELECT "s"."started_at" AT TIME ZONE coalesce("s"."timezone", 'UTC') AS "local"
           FROM ${COUNTED}
         ) "l" GROUP BY 1, 2`,
      params,
    ),
    query<AdminBusinessBucket>(
      `SELECT CASE
             WHEN "s"."distance_m" < 5000 THEN '<5' WHEN "s"."distance_m" < 10000 THEN '5-10'
             WHEN "s"."distance_m" < 25000 THEN '10-25' WHEN "s"."distance_m" < 50000 THEN '25-50'
             WHEN "s"."distance_m" < 100000 THEN '50-100' WHEN "s"."distance_m" < 200000 THEN '100-200'
             ELSE '200+' END AS "bucket", count(*)::int AS "count"
         FROM ${COUNTED} GROUP BY 1`,
      params,
    ),
    query<AdminBusinessBucket>(
      `SELECT CASE
             WHEN "n" = 1 THEN '1' WHEN "n" < 5 THEN '2-4' WHEN "n" < 10 THEN '5-9'
             WHEN "n" < 20 THEN '10-19' WHEN "n" < 50 THEN '20-49' ELSE '50+' END AS "bucket",
                count(*)::int AS "count"
         FROM (SELECT count(*) AS "n" FROM ${COUNTED} GROUP BY "s"."user_id") "p" GROUP BY 1`,
      params,
    ),
    query<AdminBusinessSports['kinds']>(
      `SELECT count(*) FILTER (WHERE NOT "s"."indoor" AND NOT "s"."manual")::int AS "outdoor",
                count(*) FILTER (WHERE "s"."indoor" AND NOT "s"."manual")::int AS "indoor",
                count(*) FILTER (WHERE "s"."manual")::int AS "manual"
         FROM ${COUNTED}`,
      params,
    ),
  ]);
  const byBucket = new Map(
    series.buckets.map((bucket) => [
      bucket,
      { bucket, activities: emptyFamilies(), distanceM: emptyFamilies() },
    ]),
  );
  for (const row of perFamily) {
    const point = byBucket.get(row.bucket);
    if (point) {
      point.activities[row.family] = row.activities;
      point.distanceM[row.family] = row.distance_m;
    }
  }
  const points = [...byBucket.values()];
  return {
    ...series,
    activities: points.map((point) => point.activities),
    distanceM: points.map((point) => point.distanceM),
    athletes: fillSeries(series.buckets, athletes, (row) => row.count, 0),
    totals,
    sports,
    week,
    distances: fillBuckets(ADMIN_DISTANCE_BUCKETS, distances),
    load: fillBuckets(ADMIN_ATHLETE_LOAD_BUCKETS, load),
    kinds,
  };
}
