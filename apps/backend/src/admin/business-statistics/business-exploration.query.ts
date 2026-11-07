import {
  ADMIN_TILE_BUCKETS,
  type AdminBusinessBucket,
  type AdminBusinessExploration,
  type AdminBusinessMeta,
} from '@kilotrace/shared/admin';
import { counted } from '../site-activity/site-activity.sql';
import { stationFirsts } from '../statistics/admin-exploration.service';
import {
  bucketOf,
  type BusinessContext,
  fillBuckets,
  fillSeries,
  seriesOf,
  type SqlQuery,
} from './business-statistics.sql';

const COUNTRIES_SHOWN = 15;

/** The tiles of the counted users, `$1` the team. */
const TILES = `"user_tiles" "t" JOIN "users" "u" ON "u"."id" = "t"."user_id" WHERE ${counted('$1')}`;

/** What the community explored, today, and what each period added to it. */
export async function businessExploration(
  query: SqlQuery,
  context: BusinessContext,
): Promise<Omit<AdminBusinessExploration, keyof AdminBusinessMeta>> {
  const { team } = context;
  const series = await seriesOf(
    query,
    context,
    `SELECT min("f"."visited_at") AS "earliest" FROM "tile_first_visits" "f" JOIN "users" "u" ON "u"."id" = "f"."user_id" WHERE ${counted('$1')}`,
  );
  const seriesParams = [team, series.buckets[0], series.unit];
  const [
    [tiles],
    [railway],
    [imported],
    individual,
    community,
    explorers,
    [medians],
    countries,
  ] = await Promise.all([
    query<{ explorers: number; tiles: number; small_tiles: string }>(
      `WITH "merged" AS (
           SELECT bit_or("t"."mask") AS "mask" FROM ${TILES} GROUP BY "t"."x", "t"."y"
         )
         SELECT (SELECT count(DISTINCT "t"."user_id")::int FROM ${TILES}) AS "explorers",
                count(*)::int AS "tiles",
                coalesce(sum(bit_count("mask"::bit(64))), 0)::bigint AS "small_tiles"
         FROM "merged"`,
      [team],
    ),
    query<{ stations: number; railway_m: number | null }>(
      `WITH ${stationFirsts(`JOIN "users" "u" ON "u"."id" = f.user_id`, `AND ${counted('$1')}`)}
         SELECT (SELECT count(*)::int FROM stations) AS "stations",
                (SELECT sum(length_m)::float FROM links) AS "railway_m"`,
      [team],
    ),
    query<{ stations: number; railway_m: number | null }>(
      `SELECT (SELECT count(*)::int FROM "places" WHERE "kind" = 'station') AS "stations",
                (SELECT sum("length_m")::float FROM "rail_links") AS "railway_m"`,
      [],
    ),
    query<{ bucket: string; tiles: number; small_tiles: number }>(
      `SELECT ${bucketOf('"s"."started_at"', '$3')} AS "bucket",
                coalesce(sum(cardinality("g"."gained_tiles")) / 2, 0)::int AS "tiles",
                coalesce(sum(cardinality("g"."gained_subtiles")) / 2, 0)::int AS "small_tiles"
         FROM "activity_gains" "g"
         JOIN "activities" "s" ON "s"."id" = "g"."activity_id"
         JOIN "users" "u" ON "u"."id" = "g"."user_id"
         WHERE ${counted('$1')} AND "s"."started_at" >= $2::date GROUP BY 1`,
      seriesParams,
    ),
    query<{ bucket: string; tiles: number }>(
      `SELECT ${bucketOf('"first"', '$3')} AS "bucket", count(*)::int AS "tiles"
         FROM (
           SELECT min("f"."visited_at") AS "first"
           FROM "tile_first_visits" "f" JOIN "users" "u" ON "u"."id" = "f"."user_id"
           WHERE ${counted('$1')} GROUP BY "f"."x", "f"."y"
         ) "firsts" WHERE "first" >= $2::date GROUP BY 1`,
      seriesParams,
    ),
    query<AdminBusinessBucket>(
      `SELECT CASE
             WHEN "n" < 100 THEN '1-99' WHEN "n" < 500 THEN '100-499' WHEN "n" < 2000 THEN '500-1999'
             WHEN "n" < 10000 THEN '2000-9999' ELSE '10000+' END AS "bucket", count(*)::int AS "count"
         FROM (SELECT count(*) AS "n" FROM ${TILES} GROUP BY "t"."user_id") "p" GROUP BY 1`,
      [team],
    ),
    query<AdminBusinessExploration['medians']>(
      `SELECT (percentile_cont(0.5) WITHIN GROUP (ORDER BY ("m"."metrics" -> 'tiles' ->> 'visited')::int))::float AS "tiles",
                (percentile_cont(0.5) WITHIN GROUP (ORDER BY ("m"."metrics" -> 'tiles' -> 'maxSquare' ->> 'size')::int))::float AS "maxSquare",
                (percentile_cont(0.5) WITHIN GROUP (ORDER BY ("m"."metrics" -> 'tiles' ->> 'maxCluster')::int))::float AS "maxCluster"
         FROM "user_tile_metrics" "m" JOIN "users" "u" ON "u"."id" = "m"."user_id"
         WHERE ${counted('$1')} AND "m"."metrics" IS NOT NULL`,
      [team],
    ),
    query<AdminBusinessExploration['countries'][number]>(
      `SELECT "c"."country_code" AS "country", count(DISTINCT ("t"."x", "t"."y"))::int AS "tiles",
                count(DISTINCT "t"."user_id")::int AS "explorers",
                max("k"."total_tiles")::int AS "totalTiles"
         FROM "user_tiles" "t"
         JOIN "users" "u" ON "u"."id" = "t"."user_id"
         JOIN "tile_countries" "c" ON "c"."x" = "t"."x" AND "c"."y" = "t"."y" AND "c"."mask" & "t"."mask" <> 0
         LEFT JOIN "countries" "k" ON "k"."code" = "c"."country_code"
         WHERE ${counted('$1')} GROUP BY 1 ORDER BY 2 DESC, 1`,
      [team],
    ),
  ]);
  const communityTiles = fillSeries(
    series.buckets,
    community,
    (row) => row.tiles,
    0,
  );
  return {
    ...series,
    totals: {
      explorers: tiles.explorers,
      tiles: tiles.tiles,
      smallTiles: Number(tiles.small_tiles),
      stations: railway.stations,
      stationsImported: imported.stations,
      railwayM: Math.round(railway.railway_m ?? 0),
      railwayImportedM: Math.round(imported.railway_m ?? 0),
      countries: countries.length,
    },
    discoveries: fillSeries(
      series.buckets,
      individual,
      (row) => ({ individual: row.tiles, smallTiles: row.small_tiles }),
      { individual: 0, smallTiles: 0 },
    ).map((point, index) => ({ ...point, community: communityTiles[index] })),
    explorers: fillBuckets(ADMIN_TILE_BUCKETS, explorers),
    medians,
    countries: countries.slice(0, COUNTRIES_SHOWN),
  };
}
