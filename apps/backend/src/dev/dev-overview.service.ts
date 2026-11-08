import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StravaRateLimiter } from '../strava/api/strava-rate-limiter';
import { StravaWebhookSubscriptionService } from '../strava/webhooks/strava-webhook-subscription.service';

const LIMIT = 50;

type Row = Record<string, unknown>;

export interface DevOverview {
  generatedAt: string;
  counts: Row;
  strava: {
    subscription: { id: number; callbackUrl: string | null } | null;
    rateLimit: ReturnType<StravaRateLimiter['snapshot']>;
  };
  users: Row[];
  connections: Row[];
  syncJobs: Row[];
  webhookEvents: Row[];
  activities: Row[];
}

/**
 * Development only: a read-only snapshot of the database, so that imports
 * and webhooks can be followed without a database client. Never exposes
 * secrets (password hashes, tokens).
 */
@Injectable()
export class DevOverviewService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly rateLimiter: StravaRateLimiter,
    private readonly subscription: StravaWebhookSubscriptionService,
  ) {}

  async overview(): Promise<DevOverview> {
    const [counts, users, connections, syncJobs, webhookEvents, activities] =
      await Promise.all([
        this.one(`SELECT
            (SELECT COUNT(*)::int FROM users) AS "users",
            (SELECT COUNT(*)::int FROM sessions) AS "sessions",
            (SELECT COUNT(*)::int FROM provider_connections) AS "connections",
            (SELECT COUNT(*)::int FROM activities) AS "activities",
            (SELECT COUNT(*)::int FROM activity_sources) AS "activitySources",
            (SELECT COUNT(*)::int FROM sync_jobs WHERE status IN ('queued', 'running')) AS "activeSyncJobs",
            (SELECT COUNT(*)::int FROM strava_webhook_events WHERE processed_at IS NULL) AS "pendingWebhookEvents"`),
        this
          .rows(`SELECT u.id, u.username, u.email, u.display_name AS "displayName",
            u.password_hash IS NOT NULL AS "hasPassword",
            (SELECT COUNT(*)::int FROM activities a WHERE a.user_id = u.id) AS "activities",
            u.created_at AS "createdAt"
          FROM users u ORDER BY u.created_at DESC LIMIT ${LIMIT}`),
        this
          .rows(`SELECT c.id, u.username, c.provider, c.provider_account_id AS "accountId",
            c.account_name AS "accountName", c.scopes,
            c.access_token_expires_at AS "tokenExpiresAt", c.last_synced_at AS "lastSyncedAt",
            c.created_at AS "connectedAt"
          FROM provider_connections c JOIN users u ON u.id = c.user_id
          ORDER BY c.created_at DESC LIMIT ${LIMIT}`),
        this
          .rows(`SELECT j.id, u.username, j.kind, j.status, j.processed, j.total,
            j.next_page AS "nextPage", j.attempts, j.error_code AS "errorCode",
            j.run_after AS "runAfter", j.started_at AS "startedAt", j.finished_at AS "finishedAt"
          FROM sync_jobs j
          JOIN provider_connections c ON c.id = j.connection_id
          JOIN users u ON u.id = c.user_id
          ORDER BY j.created_at DESC LIMIT ${LIMIT}`),
        this
          .rows(`SELECT e.id, e.object_type AS "objectType", e.object_id AS "objectId",
            e.aspect_type AS "aspectType", e.owner_id AS "ownerId", e.updates,
            e.attempts, e.last_error AS "lastError",
            e.received_at AS "receivedAt", e.processed_at AS "processedAt"
          FROM strava_webhook_events e ORDER BY e.received_at DESC LIMIT ${LIMIT}`),
        // Most recently changed first: an activity updated by a webhook comes on top.
        this.rows(`SELECT a.id, u.username, a.sport_type AS "sportType", a.name,
            a.started_at AS "startedAt", a.distance_m AS "distanceM",
            a.moving_time_s AS "movingTimeS", a.elevation_gain_m AS "elevationGainM",
            a.indoor, a.manual,
            (SELECT string_agg(s.provider || ':' || s.external_id, ', ')
               FROM activity_sources s WHERE s.activity_id = a.id) AS "sources",
            (SELECT MAX(s.fetched_at) FROM activity_sources s WHERE s.activity_id = a.id) AS "fetchedAt",
            a.created_at AS "createdAt", a.updated_at AS "updatedAt"
          FROM activities a JOIN users u ON u.id = a.user_id
          ORDER BY a.updated_at DESC LIMIT ${LIMIT}`),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      counts,
      strava: {
        subscription: this.subscription.current,
        rateLimit: this.rateLimiter.snapshot(),
      },
      users,
      connections,
      syncJobs,
      webhookEvents,
      activities,
    };
  }

  private rows(sql: string): Promise<Row[]> {
    return this.dataSource.query<Row[]>(sql);
  }

  private async one(sql: string): Promise<Row> {
    const [row] = await this.rows(sql);
    return row ?? {};
  }
}
