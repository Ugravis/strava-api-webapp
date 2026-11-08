import type {
  AdminBusinessMeta,
  AdminBusinessStrava,
} from '@kilotrace/shared/admin';
import { counted } from '../site-activity/site-activity.sql';
import type { AdminStatisticsService } from '../statistics/admin-statistics.service';
import {
  bucketOf,
  type BusinessContext,
  fillSeries,
  seriesOf,
  since,
  type SqlQuery,
} from './business-statistics.sql';

const FRESH_DAYS = 7;

/**
 * The link to Strava: accounts linked, what it imported, the health of the
 * synchronization and the quota. Webhook events belong to Strava athletes,
 * not to accounts: they are never filtered by team.
 */
export async function businessStrava(
  query: SqlQuery,
  context: BusinessContext,
  statistics: AdminStatisticsService,
): Promise<Omit<AdminBusinessStrava, keyof AdminBusinessMeta>> {
  const { from, team, now } = context;
  const series = await seriesOf(
    query,
    context,
    `SELECT min("c"."created_at") AS "earliest" FROM "provider_connections" "c" JOIN "users" "u" ON "u"."id" = "c"."user_id" WHERE ${counted('$1')}`,
  );
  const seriesParams = [team, series.buckets[0], series.unit];
  const fromJobs = `"sync_jobs" "j"
    JOIN "provider_connections" "c" ON "c"."id" = "j"."connection_id"
    JOIN "users" "u" ON "u"."id" = "c"."user_id"
    WHERE ${counted('$1')}`;
  const [
    [connections],
    connectionRows,
    activityRows,
    [jobs],
    jobRows,
    errors,
    [webhooks],
    webhookRows,
    usage,
  ] = await Promise.all([
    query<AdminBusinessStrava['connections']>(
      `SELECT count(*)::int AS "accounts", count("c"."id")::int AS "connected",
              count(*) FILTER (WHERE "c"."id" IS NOT NULL AND "c"."last_synced_at" IS NULL)::int AS "neverSynced",
              count(*) FILTER (WHERE "c"."last_synced_at" >= $2::timestamptz - interval '${FRESH_DAYS} days')::int AS "fresh",
              count(*) FILTER (WHERE "c"."scopes" LIKE '%activity:read_all%')::int AS "privateScope"
       FROM "users" "u" LEFT JOIN "provider_connections" "c" ON "c"."user_id" = "u"."id"
       WHERE ${counted('$1')}`,
      [team, now],
    ),
    query<{ bucket: string; count: number }>(
      `SELECT ${bucketOf('"c"."created_at"', '$3')} AS "bucket", count(*)::int AS "count"
       FROM "provider_connections" "c" JOIN "users" "u" ON "u"."id" = "c"."user_id"
       WHERE ${counted('$1')} AND "c"."created_at" >= $2::date GROUP BY 1`,
      seriesParams,
    ),
    query<{ bucket: string; count: number }>(
      `SELECT ${bucketOf('"a"."created_at"', '$3')} AS "bucket", count(*)::int AS "count"
       FROM "activities" "a" JOIN "users" "u" ON "u"."id" = "a"."user_id"
       WHERE ${counted('$1')} AND "a"."created_at" >= $2::date GROUP BY 1`,
      seriesParams,
    ),
    query<{
      completed: number;
      failed: number;
      active: number;
      medianDurationS: number | null;
    }>(
      `SELECT count(*) FILTER (WHERE "j"."status" = 'completed' AND ${since('"j"."finished_at"', '$2')})::int AS "completed",
              count(*) FILTER (WHERE "j"."status" = 'failed' AND ${since('"j"."finished_at"', '$2')})::int AS "failed",
              count(*) FILTER (WHERE "j"."status" IN ('queued', 'running'))::int AS "active",
              (percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM "j"."finished_at" - "j"."started_at"))
                FILTER (WHERE "j"."status" = 'completed' AND ${since('"j"."finished_at"', '$2')}))::float AS "medianDurationS"
       FROM ${fromJobs}`,
      [team, from],
    ),
    query<{ bucket: string; completed: number; failed: number }>(
      `SELECT ${bucketOf('"j"."finished_at"', '$3')} AS "bucket",
              count(*) FILTER (WHERE "j"."status" = 'completed')::int AS "completed",
              count(*) FILTER (WHERE "j"."status" = 'failed')::int AS "failed"
       FROM ${fromJobs} AND "j"."finished_at" >= $2::date GROUP BY 1`,
      seriesParams,
    ),
    query<{ code: string; count: number }>(
      `SELECT coalesce("j"."error_code", 'UNKNOWN') AS "code", count(*)::int AS "count"
       FROM ${fromJobs} AND "j"."status" = 'failed' AND ${since('"j"."finished_at"', '$2')}
       GROUP BY 1 ORDER BY 2 DESC, 1`,
      [team, from],
    ),
    query<{
      received: number;
      medianDelayS: number | null;
      pending: number;
      failing: number;
    }>(
      `SELECT count(*) FILTER (WHERE ${since('"received_at"', '$1')})::int AS "received",
              (percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM "processed_at" - "received_at"))
                FILTER (WHERE "processed_at" IS NOT NULL AND ${since('"received_at"', '$1')}))::float AS "medianDelayS",
              count(*) FILTER (WHERE "processed_at" IS NULL)::int AS "pending",
              count(*) FILTER (WHERE "processed_at" IS NULL AND "last_error" IS NOT NULL)::int AS "failing"
       FROM "strava_webhook_events"`,
      [from],
    ),
    query<{ bucket: string; create: number; update: number; delete: number }>(
      `SELECT ${bucketOf('"received_at"', '$2')} AS "bucket",
              count(*) FILTER (WHERE "aspect_type" = 'create')::int AS "create",
              count(*) FILTER (WHERE "aspect_type" = 'update')::int AS "update",
              count(*) FILTER (WHERE "aspect_type" = 'delete')::int AS "delete"
       FROM "strava_webhook_events" WHERE "received_at" >= $1::date GROUP BY 1`,
      [series.buckets[0], series.unit],
    ),
    statistics.stravaUsage(now),
  ]);
  const activities = fillSeries(
    series.buckets,
    activityRows,
    (row) => row.count,
    0,
  );
  return {
    ...series,
    connections,
    imports: fillSeries(
      series.buckets,
      connectionRows,
      (row) => row.count,
      0,
    ).map((count, index) => ({
      connections: count,
      activities: activities[index],
    })),
    jobs: {
      ...jobs,
      errors,
      series: fillSeries(
        series.buckets,
        jobRows,
        ({ completed, failed }) => ({ completed, failed }),
        { completed: 0, failed: 0 },
      ),
    },
    webhooks: {
      ...webhooks,
      series: fillSeries(
        series.buckets,
        webhookRows,
        (row) => ({
          create: row.create,
          update: row.update,
          delete: row.delete,
        }),
        { create: 0, update: 0, delete: 0 },
      ),
    },
    usage,
  };
}
