import {
  ADMIN_DURATION_BUCKETS,
  type AdminDurationBucket,
  type AdminHistogramBin,
  type AdminSiteActivityMeta,
  type AdminSiteActivityPages,
} from '@kilotrace/shared/admin';
import type { PageViewDevice } from '@kilotrace/shared';
import {
  ADMIN_PATH,
  counted,
  durationBucketSql,
  fillDays,
  fillHistogram,
  type SiteActivityContext,
  type SqlQuery,
  viewDay,
} from './site-activity.sql';

type Pages = Omit<AdminSiteActivityPages, keyof AdminSiteActivityMeta>;

const TOP_PAGES = 40;
const TREND_PAGES = 5;

/** Page views counted since `$1`, `$2` the team. */
const VIEWS = `
  "v" AS (
    SELECT "p".* FROM "page_views" "p" JOIN "users" "u" ON "u"."id" = "p"."user_id"
    WHERE "p"."at" >= $1::date AND ${counted('$2')}
  )`;

export async function siteActivityPages(
  query: SqlQuery,
  { from, team, dates }: SiteActivityContext,
): Promise<Pages> {
  const params = [from, team];
  const [
    [active],
    daily,
    pages,
    trendRows,
    heatmap,
    durations,
    devices,
    devicesDaily,
    multiDevice,
    areas,
  ] = await Promise.all([
    query<{ users: number }>(
      `SELECT count(DISTINCT "a"."user_id")::int AS "users"
       FROM "user_activity" "a" JOIN "users" "u" ON "u"."id" = "a"."user_id"
       WHERE "a"."day" >= $1::date AND ${counted('$2')}`,
      params,
    ),
    query<Pages['daily'][number]>(
      `WITH ${VIEWS}
       SELECT to_char(${viewDay('"at"')}, 'YYYY-MM-DD') AS "date", count(*)::int AS "views",
              count(DISTINCT "user_id")::int AS "viewers", sum("duration_ms")::float AS "visibleMs"
       FROM "v" GROUP BY 1`,
      params,
    ),
    // A view without visible time (closed before any beacon) is left out of the times.
    query<Pages['pages'][number]>(
      `WITH ${VIEWS}
       SELECT "path", count(*)::int AS "views", count(DISTINCT "user_id")::int AS "users",
              sum("duration_ms")::float AS "totalMs",
              avg("duration_ms") FILTER (WHERE "duration_ms" > 0)::float AS "averageMs",
              (percentile_cont(0.5) WITHIN GROUP (ORDER BY "duration_ms") FILTER (WHERE "duration_ms" > 0))::float AS "medianMs"
       FROM "v" GROUP BY "path" ORDER BY "views" DESC, "path" LIMIT ${TOP_PAGES}`,
      params,
    ),
    query<{ path: string; date: string; views: number }>(
      `WITH ${VIEWS}, "top" AS (
         SELECT "path" FROM "v" GROUP BY "path" ORDER BY count(*) DESC, "path" LIMIT ${TREND_PAGES}
       )
       SELECT "v"."path", to_char(${viewDay('"v"."at"')}, 'YYYY-MM-DD') AS "date", count(*)::int AS "views"
       FROM "v" JOIN "top" ON "top"."path" = "v"."path" GROUP BY 1, 2`,
      params,
    ),
    query<{ weekday: number; hour: number; views: number }>(
      `WITH ${VIEWS}
       SELECT extract(isodow FROM "at" AT TIME ZONE 'UTC')::int AS "weekday",
              extract(hour FROM "at" AT TIME ZONE 'UTC')::int AS "hour", count(*)::int AS "views"
       FROM "v" GROUP BY 1, 2`,
      params,
    ),
    query<{ bucket: AdminDurationBucket; views: number }>(
      `WITH ${VIEWS}
       SELECT ${durationBucketSql('"duration_ms"')} AS "bucket", count(*)::int AS "views" FROM "v" GROUP BY 1`,
      params,
    ),
    query<Pages['devices'][number]>(
      `WITH ${VIEWS}
       SELECT "device", count(*)::int AS "views", count(DISTINCT "user_id")::int AS "users",
              sum("duration_ms")::float AS "visibleMs"
       FROM "v" GROUP BY 1 ORDER BY "views" DESC`,
      params,
    ),
    query<{ date: string; device: PageViewDevice; views: number }>(
      `WITH ${VIEWS}
       SELECT to_char(${viewDay('"at"')}, 'YYYY-MM-DD') AS "date", "device", count(*)::int AS "views"
       FROM "v" GROUP BY 1, 2`,
      params,
    ),
    query<AdminHistogramBin>(
      `WITH ${VIEWS}
       SELECT "kinds" AS "value", count(*)::int AS "count"
       FROM (SELECT count(DISTINCT "device")::int AS "kinds" FROM "v" GROUP BY "user_id") "k"
       GROUP BY 1`,
      params,
    ),
    query<Pages['areas'][number]>(
      `WITH ${VIEWS}
       SELECT CASE WHEN "path" LIKE ${ADMIN_PATH} THEN 'admin' ELSE 'app' END AS "area",
              count(*)::int AS "views", count(DISTINCT "user_id")::int AS "users",
              sum("duration_ms")::float AS "visibleMs"
       FROM "v" GROUP BY 1 ORDER BY 1 DESC`,
      params,
    ),
  ]);

  const cells = new Map(
    heatmap.map((cell) => [`${cell.weekday}/${cell.hour}`, cell.views]),
  );
  const byBucket = new Map(durations.map((row) => [row.bucket, row.views]));
  const trendPaths = [...new Set(trendRows.map((row) => row.path))];
  const trendViews = new Map(
    trendRows.map((row) => [`${row.path}/${row.date}`, row.views]),
  );
  const deviceDays = new Map<string, Pages['devicesDaily'][number]>();
  for (const row of devicesDaily) {
    const day = deviceDays.get(row.date) ?? {
      date: row.date,
      mobile: 0,
      tablet: 0,
      desktop: 0,
    };
    day[row.device] = row.views;
    deviceDays.set(row.date, day);
  }

  return {
    activeUsers: active.users,
    daily: fillDays(dates, daily, { views: 0, viewers: 0, visibleMs: 0 }),
    pages,
    trends: trendPaths
      .map((path) => ({
        path,
        values: dates.map((date) => trendViews.get(`${path}/${date}`) ?? 0),
      }))
      .sort(
        (a, b) =>
          b.values.reduce((sum, value) => sum + value, 0) -
          a.values.reduce((sum, value) => sum + value, 0),
      ),
    heatmap: Array.from({ length: 7 * 24 }, (_, index) => {
      const weekday = Math.floor(index / 24) + 1;
      const hour = index % 24;
      return { weekday, hour, views: cells.get(`${weekday}/${hour}`) ?? 0 };
    }),
    durations: ADMIN_DURATION_BUCKETS.map((bucket) => ({
      bucket,
      views: byBucket.get(bucket) ?? 0,
    })),
    devices,
    devicesDaily: fillDays(dates, [...deviceDays.values()], {
      mobile: 0,
      tablet: 0,
      desktop: 0,
    }),
    multiDevice: fillHistogram(multiDevice),
    areas,
  };
}
