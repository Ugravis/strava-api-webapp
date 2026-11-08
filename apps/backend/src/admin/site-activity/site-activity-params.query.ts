import type {
  AdminSiteActivityMeta,
  AdminSiteActivityParams,
} from '@kilotrace/shared/admin';
import {
  paramKeySql,
  paramPairsSql,
  paramRawValueSql,
  paramValueSql,
} from '../../site-activity/query-params.sql';
import {
  counted,
  viewed,
  type SiteActivityContext,
  type SqlQuery,
} from './site-activity.sql';

type Params = Omit<AdminSiteActivityParams, keyof AdminSiteActivityMeta>;

const TOP_KEYS = 60;
const TOP_VALUES = 80;
const TOP_QUERIES = 50;

/** Query strings of the page views counted since `$1`, `$2` the team. */
const queriesSql = (admin: boolean) => `
  "q" AS (
    SELECT "p"."id", "p"."user_id", "p"."path", "q"."query", "q"."duration_ms"
    FROM "page_view_queries" "q"
    JOIN "page_views" "p" ON "p"."id" = "q"."view_id"
    JOIN "users" "u" ON "u"."id" = "p"."user_id"
    WHERE "p"."at" >= $1::date AND ${counted('$2')} AND ${viewed(admin)}
  )`;

/** Their `key=value` pairs. */
const pairsSql = (admin: boolean) => `${queriesSql(admin)}, "pairs" AS (
    SELECT "q"."id", "q"."user_id", "q"."path", "q"."duration_ms",
           ${paramKeySql('"pair"')} AS "key", ${paramRawValueSql('"pair"')} AS "raw",
           ${paramValueSql('"pair"')} AS "value"
    FROM "q" CROSS JOIN LATERAL ${paramPairsSql('"q"."query"')} AS "pair"
    WHERE "pair" <> ''
  )`;

export async function siteActivityParams(
  query: SqlQuery,
  { from, team, admin }: SiteActivityContext,
): Promise<Params> {
  const QUERIES = queriesSql(admin);
  const PAIRS = pairsSql(admin);
  const params = [from, team];
  const [keys, values, queries] = await Promise.all([
    query<Params['keys'][number]>(
      `WITH ${PAIRS}, "path_views" AS (
         SELECT "p"."path", count(*) AS "views" FROM "page_views" "p" JOIN "users" "u" ON "u"."id" = "p"."user_id"
         WHERE "p"."at" >= $1::date AND ${counted('$2')} AND ${viewed(admin)} GROUP BY 1
       )
       SELECT "pairs"."path", "key", count(DISTINCT "id")::int AS "views", count(DISTINCT "user_id")::int AS "users",
              (count(DISTINCT "id")::float / max("path_views"."views")) AS "share",
              sum("duration_ms")::float AS "visibleMs", count(DISTINCT "raw")::int AS "distinctValues"
       FROM "pairs" JOIN "path_views" ON "path_views"."path" = "pairs"."path"
       GROUP BY 1, 2 ORDER BY 3 DESC, 1, 2 LIMIT ${TOP_KEYS}`,
      params,
    ),
    query<Params['values'][number]>(
      `WITH ${PAIRS}
       SELECT "path", "key", "value", count(DISTINCT "id")::int AS "views",
              count(DISTINCT "user_id")::int AS "users", sum("duration_ms")::float AS "visibleMs"
       FROM "pairs" GROUP BY 1, 2, 3 ORDER BY 4 DESC, 1, 2, 3 LIMIT ${TOP_VALUES}`,
      params,
    ),
    query<Params['queries'][number]>(
      `WITH ${QUERIES}
       SELECT "path", "query", count(DISTINCT "id")::int AS "views",
              count(DISTINCT "user_id")::int AS "users", sum("duration_ms")::float AS "visibleMs"
       FROM "q" GROUP BY 1, 2 ORDER BY 3 DESC, 1, 2 LIMIT ${TOP_QUERIES}`,
      params,
    ),
  ]);
  return { keys, values, queries };
}
