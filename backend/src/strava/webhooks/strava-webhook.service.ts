import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository } from 'typeorm';
import { ActivitiesService } from '../../activities/activities.service';
import type { ProviderConnection } from '../../connections/provider-connection.entity';
import { StravaApiClient } from '../api/strava-api.client';
import {
  StravaApiError,
  StravaAuthorizationRevokedError,
  StravaRateLimitedError,
} from '../api/strava-api.errors';
import { toActivityData } from '../strava-activity.mapper';
import { StravaConnectionService } from '../strava-connection.service';
import type { StravaWebhookEventDto } from './strava-webhook-event.dto';
import { StravaWebhookEvent } from './strava-webhook-event.entity';

const PROVIDER = 'strava';
const MAX_ATTEMPTS = 5;

/**
 * Strava webhook events are not signed: their content is never trusted.
 * Each event only triggers a read of the current state from Strava, which
 * also makes the processing idempotent and independent of the event order.
 */
@Injectable()
export class StravaWebhookService {
  private readonly logger = new Logger(StravaWebhookService.name);

  constructor(
    @InjectRepository(StravaWebhookEvent)
    private readonly events: Repository<StravaWebhookEvent>,
    private readonly api: StravaApiClient,
    private readonly connections: StravaConnectionService,
    private readonly activities: ActivitiesService,
  ) {}

  async record(dto: StravaWebhookEventDto): Promise<void> {
    await this.events.save({
      objectType: dto.object_type,
      objectId: String(dto.object_id),
      aspectType: dto.aspect_type,
      ownerId: String(dto.owner_id),
      updates: dto.updates ?? {},
      eventTime: new Date(dto.event_time * 1000),
    });
  }

  /** Atomically takes the next pending event, safe with several workers. */
  async claimNext(): Promise<StravaWebhookEvent | null> {
    const rows: { id: string }[][] = await this.events.query(
      `UPDATE strava_webhook_events
       SET attempts = attempts + 1, run_after = now() + interval '5 minutes'
       WHERE id = (
         SELECT id FROM strava_webhook_events
         WHERE processed_at IS NULL AND run_after <= now()
         ORDER BY received_at
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING id`,
    );
    const id = rows[0]?.[0]?.id;
    return id ? this.events.findOneBy({ id }) : null;
  }

  async process(event: StravaWebhookEvent): Promise<void> {
    try {
      const connection = await this.connections.findByAthlete(event.ownerId);
      if (connection) {
        await this.apply(event, connection);
      }
      await this.events.update(event.id, {
        processedAt: new Date(),
        lastError: null,
      });
    } catch (error) {
      await this.handleError(event, error);
    }
  }

  /** Removes processed events older than the given date. */
  async purgeProcessedBefore(date: Date): Promise<void> {
    await this.events.delete({
      processedAt: Not(IsNull()),
      receivedAt: LessThan(date),
    });
  }

  private async apply(
    event: StravaWebhookEvent,
    connection: ProviderConnection,
  ): Promise<void> {
    if (event.objectType === 'athlete') {
      if (event.updates.authorized === 'false') {
        await this.verifyRevocation(connection);
      }
      return;
    }
    await this.refreshActivity(connection, event.objectId);
  }

  /** A forged event must not delete data: the revocation is checked at Strava. */
  private async verifyRevocation(
    connection: ProviderConnection,
  ): Promise<void> {
    try {
      await this.connections.accessToken(connection.id, { force: true });
      this.logger.warn(
        `Ignored a deauthorization event for connection ${connection.id}: the tokens are still valid`,
      );
    } catch (error) {
      if (!(error instanceof StravaAuthorizationRevokedError)) {
        throw error;
      }
      await this.connections.handleRevoked(connection);
    }
  }

  /** Created, updated or deleted: the activity is read again from Strava. */
  private async refreshActivity(
    connection: ProviderConnection,
    activityId: string,
  ): Promise<void> {
    const token = await this.connections.accessToken(connection.id);
    try {
      const activity = await this.api.getActivity(token, activityId);
      await this.activities.upsertFromProvider(
        connection.userId,
        PROVIDER,
        activityId,
        toActivityData(activity),
      );
    } catch (error) {
      // Deleted, or no longer visible (made private without the matching scope).
      if (error instanceof StravaApiError && error.status === 404) {
        await this.activities.removeFromProvider(connection.userId, PROVIDER, [
          activityId,
        ]);
        return;
      }
      throw error;
    }
  }

  private async handleError(
    event: StravaWebhookEvent,
    error: unknown,
  ): Promise<void> {
    if (error instanceof StravaRateLimitedError) {
      await this.events.update(event.id, {
        runAfter: error.retryAt,
        attempts: Math.max(event.attempts - 1, 0),
      });
      return;
    }
    if (error instanceof StravaAuthorizationRevokedError) {
      const connection = await this.connections.findByAthlete(event.ownerId);
      if (connection) {
        await this.connections.handleRevoked(connection);
      }
      await this.events.update(event.id, { processedAt: new Date() });
      return;
    }
    const message = String(error);
    this.logger.error(
      `Strava webhook event ${event.id} failed (attempt ${event.attempts}): ${message}`,
    );
    const giveUp = event.attempts >= MAX_ATTEMPTS;
    await this.events.update(event.id, {
      lastError: message.slice(0, 1000),
      processedAt: giveUp ? new Date() : null,
      runAfter: new Date(Date.now() + 30_000 * 2 ** (event.attempts - 1)),
    });
  }
}
