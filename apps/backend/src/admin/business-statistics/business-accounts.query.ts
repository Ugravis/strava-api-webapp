import {
  ADMIN_RECENCY_BUCKETS,
  type AdminBusinessAccounts,
  type AdminBusinessBucket,
  type AdminBusinessMeta,
} from '@kilotrace/shared/admin';
import { counted } from '../site-activity/site-activity.sql';
import {
  bucketOf,
  type BusinessContext,
  fillBuckets,
  fillSeries,
  seriesOf,
  since,
  type SqlQuery,
} from './business-statistics.sql';

/** Activities from which an account counts as regular. */
const REGULAR_ACTIVITIES = 10;

const COUNTRIES_SHOWN = 10;

/** Accounts, their sign-ups by method, how far they went and what they filled in. */
export async function businessAccounts(
  query: SqlQuery,
  context: BusinessContext,
): Promise<Omit<AdminBusinessAccounts, keyof AdminBusinessMeta>> {
  const { from, team, now } = context;
  const series = await seriesOf(
    query,
    context,
    `SELECT min("u"."created_at") AS "earliest" FROM "users" "u" WHERE ${counted('$1')}`,
  );
  const first = series.buckets[0];
  const [
    [before],
    signups,
    [activation],
    [median],
    [profile],
    [status],
    countries,
    favoriteSports,
    tags,
    recency,
  ] = await Promise.all([
    query<{ count: number }>(
      `SELECT count(*)::int AS "count" FROM "users" "u" WHERE ${counted('$1')} AND "u"."created_at" < $2::date`,
      [team, first],
    ),
    query<{ bucket: string; email: number; google: number }>(
      `SELECT ${bucketOf('"u"."created_at"', '$1')} AS "bucket",
              count(*) FILTER (WHERE "o"."user_id" IS NULL)::int AS "email",
              count(*) FILTER (WHERE "o"."user_id" IS NOT NULL)::int AS "google"
       FROM "users" "u"
       LEFT JOIN (SELECT DISTINCT "user_id" FROM "oauth_accounts") "o" ON "o"."user_id" = "u"."id"
       WHERE ${counted('$2')} AND "u"."created_at" >= $3::date GROUP BY 1`,
      [series.unit, team, first],
    ),
    query<AdminBusinessAccounts['activation']>(
      `SELECT count(*)::int AS "signedUp",
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "provider_connections" "c" WHERE "c"."user_id" = "u"."id"))::int AS "connected",
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "activities" "a" WHERE "a"."user_id" = "u"."id"))::int AS "imported",
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "user_tiles" "t" WHERE "t"."user_id" = "u"."id"))::int AS "explored",
              count(*) FILTER (WHERE (SELECT count(*) FROM (SELECT 1 FROM "activities" "a" WHERE "a"."user_id" = "u"."id" LIMIT ${REGULAR_ACTIVITIES}) "r") >= ${REGULAR_ACTIVITIES})::int AS "regular",
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "follows" "f" WHERE NOT "f"."pending" AND "u"."id" IN ("f"."follower_id", "f"."followed_id")))::int AS "social"
       FROM "users" "u" WHERE ${counted('$1')} AND ${since('"u"."created_at"', '$2')}`,
      [team, from],
    ),
    query<{ days: number | null }>(
      `SELECT (percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM "c"."created_at" - "u"."created_at") / 86400))::float AS "days"
       FROM "users" "u" JOIN "provider_connections" "c" ON "c"."user_id" = "u"."id"
       WHERE ${counted('$1')} AND ${since('"u"."created_at"', '$2')}`,
      [team, from],
    ),
    query<AdminBusinessAccounts['profile']>(
      `SELECT count(*)::int AS "total",
              count(*) FILTER (WHERE "avatar_key" IS NOT NULL OR "external_avatar_url" IS NOT NULL)::int AS "avatar",
              count(*) FILTER (WHERE coalesce("bio", '') <> '')::int AS "bio",
              count(*) FILTER (WHERE coalesce("city", '') <> '')::int AS "city",
              count("country_code")::int AS "country",
              count(*) FILTER (WHERE cardinality("favorite_sports") > 0)::int AS "sports",
              count("profile_color")::int AS "color"
       FROM "users" "u" WHERE ${counted('$1')}`,
      [team],
    ),
    query<AdminBusinessAccounts['status']>(
      `SELECT count(*) FILTER (WHERE NOT "held")::int AS "active",
              count(*) FILTER (WHERE "held")::int AS "suspended",
              count(*) FILTER (WHERE cardinality("roles") > 0)::int AS "team"
       FROM (
         SELECT "u"."roles", "u"."suspended_at" IS NOT NULL AND ("u"."suspended_until" IS NULL OR "u"."suspended_until" > $2) AS "held"
         FROM "users" "u" WHERE ${counted('$1')}
       ) "s"`,
      [team, now],
    ),
    query<{ country: string | null; count: number }>(
      `SELECT "u"."country_code" AS "country", count(*)::int AS "count"
       FROM "users" "u" WHERE ${counted('$1')} GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT ${COUNTRIES_SHOWN}`,
      [team],
    ),
    query<{ sport: string; count: number }>(
      `SELECT "sport", count(*)::int AS "count"
       FROM "users" "u", unnest("u"."favorite_sports") AS "sport"
       WHERE ${counted('$1')} GROUP BY 1 ORDER BY 2 DESC, 1`,
      [team],
    ),
    query<{ name: string; count: number }>(
      `SELECT "t"."name", count(*)::int AS "count"
       FROM "user_tag_assignments" "a"
       JOIN "user_tags" "t" ON "t"."id" = "a"."kind"
       JOIN "users" "u" ON "u"."id" = "a"."user_id"
       WHERE ${counted('$1')} GROUP BY 1 ORDER BY 2 DESC, 1`,
      [team],
    ),
    query<AdminBusinessBucket>(
      `SELECT CASE
           WHEN "last" IS NULL THEN 'never'
           WHEN "age" < 7 THEN '0-6' WHEN "age" < 30 THEN '7-29'
           WHEN "age" < 90 THEN '30-89' WHEN "age" < 365 THEN '90-364'
           ELSE '365+' END AS "bucket", count(*)::int AS "count"
       FROM (
         SELECT "l"."last", extract(epoch FROM $2::timestamptz - "l"."last") / 86400 AS "age"
         FROM "users" "u"
         LEFT JOIN (SELECT "user_id", max("started_at") AS "last" FROM "activities" GROUP BY 1) "l" ON "l"."user_id" = "u"."id"
         WHERE ${counted('$1')}
       ) "r" GROUP BY 1`,
      [team, now],
    ),
  ]);
  return {
    ...series,
    accountsBefore: before.count,
    signups: fillSeries(
      series.buckets,
      signups,
      ({ email, google }) => ({ email, google }),
      { email: 0, google: 0 },
    ),
    activation,
    medianDaysToConnect: median.days,
    profile,
    status,
    countries,
    favoriteSports,
    tags,
    recency: fillBuckets(ADMIN_RECENCY_BUCKETS, recency),
  };
}
