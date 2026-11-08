import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { ActivityData } from '../../activities/activities.service';
import { VIRTUAL_SPORT_TYPES } from '../../activities/sport-type';
import { decodePolyline } from '../../tiles/polyline';
import type { LatLng } from '../../tiles/tile-grid';
import { type PendingStream, TilesService } from '../../tiles/tiles.service';
import {
  assessTrack,
  tilesFromStream,
  tilesFromSummary,
} from '../../tiles/track-tiles';
import { StravaApiClient } from '../api/strava-api.client';
import {
  StravaApiError,
  StravaAuthorizationRevokedError,
  StravaRateLimitedError,
} from '../api/strava-api.errors';
import type { StravaActivity } from '../api/strava-api.types';
import { StravaRateLimiter } from '../api/strava-rate-limiter';
import { StravaConnectionService } from '../strava-connection.service';

const PROVIDER = 'strava';
/** Share of each Strava quota window the background refinement may use. */
const QUOTA_SHARE = 0.5;
const MAX_ATTEMPTS = 5;

function latLng(
  value: [number, number] | [] | null | undefined,
): LatLng | null {
  return value?.length === 2 ? value : null;
}

/**
 * Computes the tiles of Strava activities. The simplified track read during
 * the synchronization is used first; the full track is only fetched when it
 * changes the result (see `assessTrack`), then discarded.
 */
@Injectable()
export class StravaTilesService {
  private readonly logger = new Logger(StravaTilesService.name);

  constructor(
    private readonly tiles: TilesService,
    private readonly api: StravaApiClient,
    private readonly rateLimiter: StravaRateLimiter,
    private readonly connections: StravaConnectionService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Computes the tiles of freshly synchronized activities whose tiles are
   * not known yet. Known tiles are kept: they may come from the full track.
   */
  async fromSummaries(
    userId: string,
    activities: {
      activityId: string;
      activity: StravaActivity;
      data: ActivityData;
    }[],
  ): Promise<void> {
    const handled = await this.tiles.handled(
      activities.map(({ activityId }) => activityId),
    );
    for (const { activityId, activity, data } of activities) {
      if (!handled.has(activityId)) {
        await this.fromSummary(userId, activityId, activity, data);
      }
    }
  }

  /** After a complete import: activities Strava no longer lists have no track to read. */
  markUnhandledAsNoTrack(userId: string): Promise<void> {
    return this.tiles.markUnhandledAsNoTrack(userId);
  }

  /**
   * Refines the tiles of one activity with its full track. Returns whether
   * there was something to do; nothing is done once the share of the
   * Strava quota left to background work is used.
   */
  async refineNext(): Promise<boolean> {
    if (!this.rateLimiter.hasCapacity(QUOTA_SHARE)) {
      return false;
    }
    const pending = await this.tiles.claimNextStream();
    if (!pending) {
      return false;
    }
    try {
      await this.refine(pending);
    } catch (error) {
      await this.handleError(pending, error);
    }
    return true;
  }

  private async fromSummary(
    userId: string,
    activityId: string,
    activity: StravaActivity,
    data: ActivityData,
  ): Promise<void> {
    const polyline = activity.map?.summary_polyline;
    const virtual = VIRTUAL_SPORT_TYPES.includes(data.sportType);
    if (!polyline || data.indoor || data.manual || virtual) {
      await this.tiles.markNoTrack(activityId);
      return;
    }
    const summary = {
      points: decodePolyline(polyline),
      distanceM: activity.distance,
      start: latLng(activity.start_latlng),
      end: latLng(activity.end_latlng),
    };
    const assessment = assessTrack(summary);
    const cropped = assessment.hiddenStartM > 0 || assessment.hiddenEndM > 0;
    await this.tiles.saveFromSummary(
      userId,
      activityId,
      tilesFromSummary(summary, assessment),
      assessment,
      assessment.sparse ? 'sparse' : cropped ? 'cropped' : null,
    );
  }

  private async refine(pending: PendingStream): Promise<void> {
    // Checked when claimed rather than when synchronized: an older activity
    // from the same place may have resolved the area in the meantime.
    if (
      pending.reason === 'cropped' &&
      (await this.tiles.hiddenAreasCovered(pending))
    ) {
      await this.tiles.complete(pending.activityId);
      return;
    }
    const source = await this.sourceOf(pending);
    const connection = await this.connections.findForUser(pending.userId);
    if (!source || !connection) {
      await this.tiles.complete(pending.activityId);
      return;
    }
    const token = await this.connections.accessToken(connection.id);
    const points = await this.api.getLatLngStream(token, source.externalId);
    if (!points) {
      await this.tiles.complete(pending.activityId);
      return;
    }
    await this.tiles.saveFromStream(
      pending,
      tilesFromStream(points, pending.hiddenStartM, pending.hiddenEndM),
    );
  }

  private async sourceOf(
    pending: PendingStream,
  ): Promise<{ externalId: string } | null> {
    const [row]: { external_id: string }[] = await this.dataSource.query(
      `SELECT external_id FROM activity_sources
       WHERE activity_id = $1 AND provider = $2`,
      [pending.activityId, PROVIDER],
    );
    return row ? { externalId: row.external_id } : null;
  }

  private async handleError(
    pending: PendingStream,
    error: unknown,
  ): Promise<void> {
    if (error instanceof StravaRateLimitedError) {
      await this.tiles.defer(pending.activityId, error.retryAt);
      return;
    }
    if (error instanceof StravaAuthorizationRevokedError) {
      const connection = await this.connections.findForUser(pending.userId);
      if (connection) {
        await this.connections.handleRevoked(connection);
      }
      return;
    }
    // Deleted, or no longer visible: its tiles leave with the next sync.
    if (error instanceof StravaApiError && error.status === 404) {
      await this.tiles.complete(pending.activityId);
      return;
    }
    this.logger.error(
      `Tile refinement of activity ${pending.activityId} failed (attempt ${pending.attempts}): ${String(error)}`,
    );
    if (pending.attempts >= MAX_ATTEMPTS) {
      // The tiles of the simplified track stay.
      await this.tiles.complete(pending.activityId);
      return;
    }
    await this.tiles.defer(
      pending.activityId,
      new Date(Date.now() + 60_000 * 2 ** pending.attempts),
    );
  }
}
