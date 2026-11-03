import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { PageViewBeaconDto } from './page-views.dto';
import { paramKeySql, paramPairsSql, paramValueSql } from './query-params.sql';

/** Page views are kept that long, then summed up without the users. */
export const PAGE_VIEW_RETENTION_DAYS = 90;

@Injectable()
export class PageViewsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * The first beacon of a view creates it, the next ones only raise its
   * visible times. A view of another user is left untouched.
   */
  async record(userId: string, beacon: PageViewBeaconDto): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const owned = await manager.query<{ id: string }[]>(
        `INSERT INTO "page_views" ("id", "user_id", "path", "at", "device", "duration_ms")
         VALUES ($1, $2, $3, now() - make_interval(secs => $5::int / 1000.0), $4, $5)
         ON CONFLICT ("id") DO UPDATE
           SET "duration_ms" = GREATEST("page_views"."duration_ms", EXCLUDED."duration_ms")
           WHERE "page_views"."user_id" = EXCLUDED."user_id"
         RETURNING "id"`,
        [beacon.id, userId, beacon.path, beacon.device, beacon.durationMs],
      );
      if (owned.length === 0 || beacon.queries.length === 0) {
        return;
      }
      await manager.query(
        `INSERT INTO "page_view_queries" ("view_id", "query", "duration_ms")
         SELECT $1, "query", max("duration_ms") FROM unnest($2::text[], $3::int[]) AS "q"("query", "duration_ms")
         GROUP BY "query"
         ON CONFLICT ("view_id", "query") DO UPDATE
           SET "duration_ms" = GREATEST("page_view_queries"."duration_ms", EXCLUDED."duration_ms")`,
        [
          beacon.id,
          beacon.queries.map((entry) => entry.query),
          beacon.queries.map((entry) => entry.durationMs),
        ],
      );
    });
  }

  /**
   * Moves the views older than the retention into the hourly summary, and
   * their query strings into the daily one, in one statement: nothing is
   * deleted without being counted. The query strings go with their views.
   * @returns the views moved.
   */
  async summarize(now = new Date()): Promise<number> {
    const cutoff = new Date(
      now.getTime() - PAGE_VIEW_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const [{ moved }] = await this.dataSource.query<{ moved: number }[]>(
      `WITH "moved" AS (
         DELETE FROM "page_views" WHERE "at" < $1
         RETURNING "id", "user_id", "path", "at", "device", "duration_ms"
       ), "summary" AS (
         INSERT INTO "page_view_daily" ("day", "hour", "path", "device", "team", "views", "users", "duration_ms")
         SELECT ("m"."at" AT TIME ZONE 'UTC')::date,
                extract(hour FROM "m"."at" AT TIME ZONE 'UTC')::smallint,
                "m"."path", "m"."device", cardinality("u"."roles") > 0,
                count(*)::int, count(DISTINCT "m"."user_id")::int, sum("m"."duration_ms")
         FROM "moved" "m" JOIN "users" "u" ON "u"."id" = "m"."user_id"
         GROUP BY 1, 2, 3, 4, 5
         ON CONFLICT ("day", "hour", "path", "device", "team") DO UPDATE SET
           "views" = "page_view_daily"."views" + EXCLUDED."views",
           "users" = "page_view_daily"."users" + EXCLUDED."users",
           "duration_ms" = "page_view_daily"."duration_ms" + EXCLUDED."duration_ms"
       ), "pairs" AS (
         SELECT "m"."id", "m"."user_id", "m"."path", "m"."at", "q"."duration_ms", "pair"
         FROM "moved" "m"
         JOIN "page_view_queries" "q" ON "q"."view_id" = "m"."id"
         CROSS JOIN LATERAL ${paramPairsSql('"q"."query"')} AS "pair"
         WHERE "pair" <> ''
       ), "params" AS (
         INSERT INTO "page_query_daily" ("day", "path", "key", "value", "team", "views", "users", "duration_ms")
         SELECT ("p"."at" AT TIME ZONE 'UTC')::date, "p"."path",
                ${paramKeySql('"p"."pair"')}, ${paramValueSql('"p"."pair"')},
                cardinality("u"."roles") > 0,
                count(DISTINCT "p"."id")::int, count(DISTINCT "p"."user_id")::int, sum("p"."duration_ms")
         FROM "pairs" "p" JOIN "users" "u" ON "u"."id" = "p"."user_id"
         GROUP BY 1, 2, 3, 4, 5
         ON CONFLICT ("day", "path", "key", "value", "team") DO UPDATE SET
           "views" = "page_query_daily"."views" + EXCLUDED."views",
           "users" = "page_query_daily"."users" + EXCLUDED."users",
           "duration_ms" = "page_query_daily"."duration_ms" + EXCLUDED."duration_ms"
       )
       SELECT count(*)::int AS "moved" FROM "moved"`,
      [cutoff],
    );
    return moved;
  }
}
