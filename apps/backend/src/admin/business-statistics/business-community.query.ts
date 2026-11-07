import {
  ADMIN_FOLLOWER_BUCKETS,
  type AdminBusinessBucket,
  type AdminBusinessCommunity,
  type AdminBusinessMeta,
} from '@kilotrace/shared/admin';
import { FAMILY_SPORT_TYPES } from '../../distances/distance-families';
import { counted } from '../site-activity/site-activity.sql';
import { stationFirsts } from '../statistics/admin-exploration.service';
import {
  bucketOf,
  type BusinessContext,
  familySql,
  fillBuckets,
  fillSeries,
  seriesOf,
  since,
  type SqlQuery,
} from './business-statistics.sql';

const BADGES_SHOWN = 8;

/** Follows between counted users, `$1` the team. */
const FOLLOWS = `"follows" "f"
  JOIN "users" "u" ON "u"."id" = "f"."follower_id"
  JOIN "users" "v" ON "v"."id" = "f"."followed_id"
  WHERE ${counted('$1')} AND ($1::boolean OR cardinality("v"."roles") = 0)`;

/** Key of an amount of an athlete: a metric, of a family or of all sports. */
const amountKey = (metric: string, family: string) => `${metric}:${family}`;

interface BadgeRow {
  id: string;
  name: string;
  metric: string;
  family: string;
  target: number;
  tiers: number[] | null;
}

/**
 * Athletes having reached each active badge, a tiered badge from its first
 * tier. The amounts follow the rules of the distances: sports of a family or
 * all of them, then what is achieved whatever the sport.
 */
async function earnedBadges(query: SqlQuery, team: boolean) {
  const [badges, amounts, achieved] = await Promise.all([
    query<BadgeRow>(
      `SELECT "id", "name", "metric", "family", "target", "tiers" FROM "badges" WHERE "active"`,
      [],
    ),
    query<{
      user_id: string;
      family: string;
      distance: number;
      time: number;
      elevation: number;
      activities: number;
    }>(
      `SELECT "s"."user_id", ${familySql('"s"."sport_type"')} AS "family",
              sum("s"."distance_m")::float AS "distance", sum("s"."moving_time_s")::float AS "time",
              coalesce(sum("s"."elevation_gain_m"), 0)::float AS "elevation", count(*)::int AS "activities"
       FROM "activities" "s" JOIN "users" "u" ON "u"."id" = "s"."user_id"
       WHERE ${counted('$1')} GROUP BY 1, 2`,
      [team],
    ),
    query<{
      user_id: string;
      active_days: number;
      tiles: number | null;
      subtiles: number | null;
      stations: number | null;
    }>(
      `WITH ${stationFirsts(`JOIN "users" "u" ON "u"."id" = f.user_id`, `AND ${counted('$1')}`)},
       "visited" AS (SELECT "user_id", count(*)::int AS "stations" FROM firsts GROUP BY 1),
       "days" AS (
         SELECT "s"."user_id", count(DISTINCT ("s"."started_at" AT TIME ZONE 'UTC')::date)::int AS "active_days"
         FROM "activities" "s" GROUP BY 1
       )
       SELECT "u"."id" AS "user_id", coalesce("d"."active_days", 0) AS "active_days",
              ("m"."metrics" -> 'tiles' ->> 'visited')::int AS "tiles",
              ("m"."metrics" -> 'subtiles' ->> 'visited')::int AS "subtiles",
              "v"."stations"
       FROM "users" "u"
       LEFT JOIN "days" "d" ON "d"."user_id" = "u"."id"
       LEFT JOIN "user_tile_metrics" "m" ON "m"."user_id" = "u"."id"
       LEFT JOIN "visited" "v" ON "v"."user_id" = "u"."id"
       WHERE ${counted('$1')}`,
      [team],
    ),
  ]);

  const athletes = new Map<string, Map<string, number>>();
  const add = (user: string, key: string, amount: number) => {
    const held = athletes.get(user) ?? new Map<string, number>();
    held.set(key, (held.get(key) ?? 0) + amount);
    athletes.set(user, held);
  };
  for (const row of amounts) {
    for (const family of [row.family, 'all']) {
      add(row.user_id, amountKey('distance', family), row.distance);
      add(row.user_id, amountKey('time', family), row.time);
      add(row.user_id, amountKey('elevation', family), row.elevation);
      add(row.user_id, amountKey('activities', family), row.activities);
    }
  }
  for (const row of achieved) {
    add(row.user_id, amountKey('active_days', 'all'), row.active_days);
    add(row.user_id, amountKey('tiles', 'all'), row.tiles ?? 0);
    add(row.user_id, amountKey('subtiles', 'all'), row.subtiles ?? 0);
    add(row.user_id, amountKey('stations', 'all'), row.stations ?? 0);
  }
  const practising = [...athletes.values()].filter(
    (held) => (held.get(amountKey('activities', 'all')) ?? 0) > 0,
  );
  const earned = badges
    .filter(
      (badge) => badge.family === 'all' || badge.family in FAMILY_SPORT_TYPES,
    )
    .map(({ id, name, metric, family, target, tiers }) => {
      const threshold = tiers?.[0] ?? target;
      const key = amountKey(metric, family);
      return {
        id,
        name,
        count: practising.filter((held) => (held.get(key) ?? 0) >= threshold)
          .length,
      };
    })
    .filter((badge) => badge.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, BADGES_SHOWN);
  return { active: badges.length, athletes: practising.length, earned };
}

/** Links between accounts, what they send each other and the badges they care about. */
export async function businessCommunity(
  query: SqlQuery,
  context: BusinessContext,
): Promise<Omit<AdminBusinessCommunity, keyof AdminBusinessMeta>> {
  const { from, previousFrom, until, team } = context;
  const series = await seriesOf(
    query,
    context,
    `SELECT min("f"."created_at") AS "earliest" FROM ${FOLLOWS}`,
  );
  const first = series.buckets[0];
  const likesCount = (start: string | null, end: string | null) =>
    query<{ count: number }>(
      `SELECT count(*)::int AS "count" FROM "profile_likes" "l" JOIN "users" "u" ON "u"."id" = "l"."user_id"
       WHERE ${counted('$1')} AND ${since('"l"."created_at"', '$2')} AND "l"."created_at" < $3::date`,
      [team, start, end],
    );
  const [
    [follows],
    [profiles],
    followRows,
    likeRows,
    followers,
    notifications,
    earned,
    favorites,
    pinned,
    [likes],
    previousLikes,
  ] = await Promise.all([
    query<AdminBusinessCommunity['follows'] & { accounts: number }>(
      `WITH "kept" AS (SELECT "f"."follower_id", "f"."followed_id", "f"."pending" FROM ${FOLLOWS}),
       "accepted" AS (SELECT * FROM "kept" WHERE NOT "pending")
       SELECT (SELECT count(*)::int FROM "accepted") AS "accepted",
              (SELECT count(*)::int FROM "kept" WHERE "pending") AS "pending",
              (SELECT count(*)::int / 2 FROM "accepted" "a"
                 JOIN "accepted" "b" ON "a"."follower_id" = "b"."followed_id" AND "a"."followed_id" = "b"."follower_id") AS "mutualPairs",
              (SELECT count(*)::int FROM (SELECT "follower_id" FROM "accepted" UNION SELECT "followed_id" FROM "accepted") "c") AS "connectedAccounts",
              (SELECT count(*)::int FROM "users" "u" WHERE ${counted('$1')}) AS "accounts"`,
      [team],
    ),
    query<AdminBusinessCommunity['profiles']>(
      `SELECT count(*) FILTER (WHERE "profile_private")::int AS "private",
              count(*) FILTER (WHERE NOT "profile_private")::int AS "public"
       FROM "users" "u" WHERE ${counted('$1')}`,
      [team],
    ),
    query<{ bucket: string; count: number }>(
      `SELECT ${bucketOf('"f"."created_at"', '$2')} AS "bucket", count(*)::int AS "count"
       FROM ${FOLLOWS} AND NOT "f"."pending" AND "f"."created_at" >= $3::date GROUP BY 1`,
      [team, series.unit, first],
    ),
    query<{ bucket: string; count: number }>(
      `SELECT ${bucketOf('"l"."created_at"', '$2')} AS "bucket", count(*)::int AS "count"
       FROM "profile_likes" "l" JOIN "users" "u" ON "u"."id" = "l"."user_id"
       WHERE ${counted('$1')} AND "l"."created_at" >= $3::date GROUP BY 1`,
      [team, series.unit, first],
    ),
    query<AdminBusinessBucket>(
      `SELECT CASE
           WHEN "n" = 0 THEN '0' WHEN "n" = 1 THEN '1' WHEN "n" < 5 THEN '2-4'
           WHEN "n" < 10 THEN '5-9' ELSE '10+' END AS "bucket", count(*)::int AS "count"
       FROM (
         SELECT (SELECT count(*) FROM "follows" "f" WHERE "f"."followed_id" = "u"."id" AND NOT "f"."pending") AS "n"
         FROM "users" "u" WHERE ${counted('$1')}
       ) "p" GROUP BY 1`,
      [team],
    ),
    query<AdminBusinessCommunity['notifications'][number]>(
      `SELECT "n"."type", count(*)::int AS "sent", count("n"."read_at")::int AS "read"
       FROM "notifications" "n" JOIN "users" "u" ON "u"."id" = "n"."user_id"
       WHERE ${counted('$1')} AND ${since('"n"."created_at"', '$2')} GROUP BY 1 ORDER BY 2 DESC, 1`,
      [team, from],
    ),
    earnedBadges(query, team),
    query<{ id: string; name: string; count: number }>(
      `SELECT "b"."id", "b"."name", count(*)::int AS "count"
       FROM "user_favorite_badges" "f"
       JOIN "badges" "b" ON "b"."id" = "f"."badge_id"
       JOIN "users" "u" ON "u"."id" = "f"."user_id"
       WHERE ${counted('$1')} GROUP BY 1, 2 ORDER BY 3 DESC, 2 LIMIT ${BADGES_SHOWN}`,
      [team],
    ),
    query<{ id: string; name: string; count: number }>(
      `SELECT "b"."id", "b"."name", count(*)::int AS "count"
       FROM "user_profile_badges" "f"
       JOIN "badges" "b" ON "b"."id" = "f"."badge_id"
       JOIN "users" "u" ON "u"."id" = "f"."user_id"
       WHERE ${counted('$1')} GROUP BY 1, 2 ORDER BY 3 DESC, 2 LIMIT ${BADGES_SHOWN}`,
      [team],
    ),
    likesCount(from, until),
    previousFrom ? likesCount(previousFrom, from) : Promise.resolve([]),
  ]);
  const { accounts, ...followFigures } = follows;
  const likesPerPoint = fillSeries(
    series.buckets,
    likeRows,
    (row) => row.count,
    0,
  );
  return {
    ...series,
    follows: followFigures,
    accounts,
    profiles,
    growth: fillSeries(series.buckets, followRows, (row) => row.count, 0).map(
      (count, index) => ({ follows: count, likes: likesPerPoint[index] }),
    ),
    likes: {
      current: likes.count,
      previous: previousLikes[0]?.count ?? null,
    },
    followers: fillBuckets(ADMIN_FOLLOWER_BUCKETS, followers),
    notifications,
    badges: { ...earned, favorites, pinned },
  };
}
