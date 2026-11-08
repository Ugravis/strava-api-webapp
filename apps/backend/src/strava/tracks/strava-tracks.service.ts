import { Injectable } from '@nestjs/common';
import { ActivitiesService } from '../../activities/activities.service';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { StravaApiClient } from '../api/strava-api.client';
import {
  StravaAuthorizationRevokedError,
  StravaRateLimitedError,
} from '../api/strava-api.errors';
import { StravaConnectionService } from '../strava-connection.service';

const PROVIDER = 'strava';
/** Largest page accepted by Strava. */
const PAGE_SIZE = 200;

export interface ActivityTrack {
  activityId: string;
  /** Google encoded polyline, or null when the activity has no GPS track. */
  polyline: string | null;
}

export interface ActivityTracksPage {
  tracks: ActivityTrack[];
  /** True when Strava may hold further activities on the next page. */
  hasMore: boolean;
}

export interface ActivityTracksRequest {
  after?: Date;
  page: number;
}

/**
 * Relays the activity tracks from Strava to the athlete's browser. The
 * Strava API Policy forbids storing location data: nothing is persisted here.
 */
@Injectable()
export class StravaTracksService {
  constructor(
    private readonly api: StravaApiClient,
    private readonly connections: StravaConnectionService,
    private readonly activities: ActivitiesService,
  ) {}

  /** Tracks of one Strava page, restricted to the activities imported for the user. */
  async page(
    userId: string,
    { after, page }: ActivityTracksRequest,
  ): Promise<ActivityTracksPage> {
    const connection = await this.connections.findForUser(userId);
    if (!connection) {
      throw notConnected();
    }
    try {
      const token = await this.connections.accessToken(connection.id);
      const batch = await this.api.listActivities(token, {
        page,
        perPage: PAGE_SIZE,
        after,
      });
      const ids = await this.activities.idsByExternalId(
        userId,
        PROVIDER,
        batch.map((activity) => String(activity.id)),
      );
      const tracks: ActivityTrack[] = [];
      for (const activity of batch) {
        const activityId = ids.get(String(activity.id));
        if (activityId) {
          tracks.push({
            activityId,
            polyline: activity.map?.summary_polyline || null,
          });
        }
      }
      return { tracks, hasMore: batch.length === PAGE_SIZE };
    } catch (error) {
      if (error instanceof StravaRateLimitedError) {
        throw ApiErrors.tooManyRequests(
          ApiErrorCode.ProviderRateLimited,
          `Strava rate limit reached, retry after ${error.retryAt.toISOString()}`,
        );
      }
      if (error instanceof StravaAuthorizationRevokedError) {
        await this.connections.handleRevoked(connection);
        throw notConnected();
      }
      throw error;
    }
  }
}

function notConnected() {
  return ApiErrors.notFound(
    ApiErrorCode.ProviderNotConnected,
    'Strava is not connected',
  );
}
