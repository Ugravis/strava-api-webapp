import {
  ADMIN_DURATION_BUCKETS,
  type AdminDurationBucket,
  type AdminHistogramBin,
  type AdminSiteActivityMeta,
  type AdminSiteActivitySessions,
} from '@kilotrace/shared/admin';
import {
  durationBucketSql,
  fillDays,
  fillHistogram,
  SESSION_GAP_MINUTES,
  sessionsSql,
  type SiteActivityContext,
  type SqlQuery,
  viewDay,
} from './site-activity.sql';

type Sessions = Omit<AdminSiteActivitySessions, keyof AdminSiteActivityMeta>;

const TOP_PAGES = 15;
const TOP_TRANSITIONS = 30;

/** The sessions since `$1`, `$2` the team. */
const sessionsWith = (admin: boolean) => `WITH ${sessionsSql('$1', '$2', admin)}`;

export async function siteActivitySessions(
  query: SqlQuery,
  { from, team, admin, dates }: SiteActivityContext,
): Promise<Sessions> {
  const SESSIONS = sessionsWith(admin);
  const params = [from, team];
  const [daily, lengths, pages, perUser, entries, exits, transitions] =
    await Promise.all([
      query<Sessions['daily'][number]>(
        `${SESSIONS}
         SELECT to_char(${viewDay('"start"')}, 'YYYY-MM-DD') AS "date", count(*)::int AS "sessions",
                count(DISTINCT "user_id")::int AS "users"
         FROM "sessions" GROUP BY 1`,
        params,
      ),
      query<{ bucket: AdminDurationBucket; sessions: number }>(
        `${SESSIONS}
         SELECT ${durationBucketSql('"visible_ms"')} AS "bucket", count(*)::int AS "sessions"
         FROM "sessions" GROUP BY 1`,
        params,
      ),
      query<AdminHistogramBin>(
        `${SESSIONS}
         SELECT "pages" AS "value", count(*)::int AS "count" FROM "sessions" GROUP BY 1`,
        params,
      ),
      query<AdminHistogramBin>(
        `${SESSIONS}
         SELECT "count" AS "value", count(*)::int AS "count"
         FROM (SELECT count(*)::int AS "count" FROM "sessions" GROUP BY "user_id") "s" GROUP BY 1`,
        params,
      ),
      query<{ path: string; sessions: number }>(
        `${SESSIONS}
         SELECT "entry" AS "path", count(*)::int AS "sessions" FROM "sessions"
         GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT ${TOP_PAGES}`,
        params,
      ),
      query<{ path: string; sessions: number }>(
        `${SESSIONS}
         SELECT "exit" AS "path", count(*)::int AS "sessions" FROM "sessions"
         GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT ${TOP_PAGES}`,
        params,
      ),
      query<{ from: string; to: string; count: number }>(
        `${SESSIONS}, "steps" AS (
           SELECT "path" AS "from",
                  lead("path") OVER (PARTITION BY "user_id", "session" ORDER BY "at", "id") AS "to"
           FROM "views"
         )
         SELECT "from", "to", count(*)::int AS "count" FROM "steps"
         WHERE "to" IS NOT NULL AND "to" <> "from"
         GROUP BY 1, 2 ORDER BY 3 DESC, 1, 2 LIMIT ${TOP_TRANSITIONS}`,
        params,
      ),
    ]);

  const byBucket = new Map(lengths.map((row) => [row.bucket, row.sessions]));
  return {
    gapMinutes: SESSION_GAP_MINUTES,
    daily: fillDays(dates, daily, { sessions: 0, users: 0 }),
    lengths: ADMIN_DURATION_BUCKETS.map((bucket) => ({
      bucket,
      sessions: byBucket.get(bucket) ?? 0,
    })),
    pages: fillHistogram(pages),
    perUser: fillHistogram(perUser),
    entries,
    exits,
    transitions,
  };
}
