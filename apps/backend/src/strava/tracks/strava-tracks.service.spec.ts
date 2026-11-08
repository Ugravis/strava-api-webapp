import { HttpStatus, NotFoundException } from '@nestjs/common';
import type { ActivitiesService } from '../../activities/activities.service';
import type { ProviderConnection } from '../../connections/provider-connection.entity';
import type { StravaApiClient } from '../api/strava-api.client';
import {
  StravaAuthorizationRevokedError,
  StravaRateLimitedError,
} from '../api/strava-api.errors';
import type { StravaActivity } from '../api/strava-api.types';
import type { StravaConnectionService } from '../strava-connection.service';
import { StravaTracksService } from './strava-tracks.service';

const connection = {
  id: 'connection-id',
  userId: 'user-id',
} as ProviderConnection;

function stravaActivity(
  id: number,
  polyline: string | null | undefined,
): StravaActivity {
  return {
    id,
    name: `Activity ${id}`,
    sport_type: 'Run',
    start_date: '2026-10-12T07:30:00Z',
    distance: 1000,
    moving_time: 300,
    elapsed_time: 320,
    map: polyline === undefined ? undefined : { summary_polyline: polyline },
  };
}

describe('StravaTracksService', () => {
  let api: jest.Mocked<Pick<StravaApiClient, 'listActivities'>>;
  let connections: jest.Mocked<
    Pick<
      StravaConnectionService,
      'findForUser' | 'accessToken' | 'handleRevoked'
    >
  >;
  let activities: jest.Mocked<Pick<ActivitiesService, 'idsByExternalId'>>;
  let service: StravaTracksService;

  beforeEach(() => {
    api = { listActivities: jest.fn() };
    connections = {
      findForUser: jest.fn().mockResolvedValue(connection),
      accessToken: jest.fn().mockResolvedValue('access-token'),
      handleRevoked: jest.fn(),
    };
    activities = { idsByExternalId: jest.fn() };
    service = new StravaTracksService(
      api as unknown as StravaApiClient,
      connections as unknown as StravaConnectionService,
      activities as unknown as ActivitiesService,
    );
  });

  it('relays the tracks of the imported activities only', async () => {
    const after = new Date('2026-10-01T00:00:00Z');
    api.listActivities.mockResolvedValue([
      stravaActivity(1, 'abc'),
      stravaActivity(2, ''),
      stravaActivity(3, undefined),
      stravaActivity(4, 'not-imported'),
    ]);
    activities.idsByExternalId.mockResolvedValue(
      new Map([
        ['1', 'activity-1'],
        ['2', 'activity-2'],
        ['3', 'activity-3'],
      ]),
    );

    const result = await service.page('user-id', { after, page: 2 });

    expect(api.listActivities).toHaveBeenCalledWith('access-token', {
      page: 2,
      perPage: 200,
      after,
    });
    expect(activities.idsByExternalId).toHaveBeenCalledWith(
      'user-id',
      'strava',
      ['1', '2', '3', '4'],
    );
    expect(result).toEqual({
      tracks: [
        { activityId: 'activity-1', polyline: 'abc' },
        { activityId: 'activity-2', polyline: null },
        { activityId: 'activity-3', polyline: null },
      ],
      hasMore: false,
    });
  });

  it('announces a further page when the Strava page is full', async () => {
    api.listActivities.mockResolvedValue(
      Array.from({ length: 200 }, (_, index) => stravaActivity(index, 'abc')),
    );
    activities.idsByExternalId.mockResolvedValue(new Map());

    const result = await service.page('user-id', { page: 1 });

    expect(result.hasMore).toBe(true);
  });

  it('rejects a user without a Strava connection', async () => {
    connections.findForUser.mockResolvedValue(null);

    await expect(service.page('user-id', { page: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(api.listActivities).not.toHaveBeenCalled();
  });

  it('answers 429 while the Strava quota is exhausted', async () => {
    api.listActivities.mockRejectedValue(
      new StravaRateLimitedError(new Date('2026-10-15T12:15:00Z')),
    );

    await expect(service.page('user-id', { page: 1 })).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('removes the connection when Strava revoked the access', async () => {
    connections.accessToken.mockRejectedValue(
      new StravaAuthorizationRevokedError(),
    );

    await expect(service.page('user-id', { page: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(connections.handleRevoked).toHaveBeenCalledWith(connection);
  });
});
