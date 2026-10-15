import type { Repository } from 'typeorm';
import type { ActivitiesService } from '../../activities/activities.service';
import type { StravaConfig } from '../../config/strava.config';
import type { ProviderConnection } from '../../connections/provider-connection.entity';
import type { StravaApiClient } from '../api/strava-api.client';
import {
  StravaApiError,
  StravaAuthorizationRevokedError,
  StravaRateLimitedError,
} from '../api/strava-api.errors';
import type { StravaConnectionService } from '../strava-connection.service';
import type { StravaWebhookEvent } from './strava-webhook-event.entity';
import { StravaWebhookService } from './strava-webhook.service';

const connection = {
  id: 'connection-id',
  userId: 'user-id',
} as ProviderConnection;

function buildEvent(
  overrides: Partial<StravaWebhookEvent>,
): StravaWebhookEvent {
  return {
    id: 'event-id',
    objectType: 'activity',
    objectId: '42',
    aspectType: 'create',
    ownerId: '1001',
    updates: {},
    attempts: 1,
    ...overrides,
  } as StravaWebhookEvent;
}

describe('StravaWebhookService', () => {
  let events: jest.Mocked<Pick<Repository<StravaWebhookEvent>, 'update'>>;
  let api: jest.Mocked<Pick<StravaApiClient, 'getActivity'>>;
  let connections: jest.Mocked<
    Pick<
      StravaConnectionService,
      'findByAthlete' | 'accessToken' | 'handleRevoked'
    >
  >;
  let activities: jest.Mocked<
    Pick<
      ActivitiesService,
      'upsertFromProvider' | 'removeFromProvider' | 'keepMostRecentFromProvider'
    >
  >;
  let service: StravaWebhookService;

  beforeEach(() => {
    events = { update: jest.fn() };
    api = { getActivity: jest.fn() };
    connections = {
      findByAthlete: jest.fn().mockResolvedValue(connection),
      accessToken: jest.fn().mockResolvedValue('access-token'),
      handleRevoked: jest.fn(),
    };
    activities = {
      upsertFromProvider: jest.fn(),
      removeFromProvider: jest.fn(),
      keepMostRecentFromProvider: jest.fn(),
    };
    service = new StravaWebhookService(
      events as unknown as Repository<StravaWebhookEvent>,
      api as unknown as StravaApiClient,
      connections as unknown as StravaConnectionService,
      activities as unknown as ActivitiesService,
      { syncMaxActivities: 50 } as StravaConfig,
    );
  });

  it('reads a created activity from Strava instead of trusting the event', async () => {
    api.getActivity.mockResolvedValue({
      id: 42,
      name: 'Run',
      sport_type: 'Run',
      start_date: '2026-10-12T07:30:00Z',
      distance: 10000,
      moving_time: 3000,
      elapsed_time: 3100,
    });

    await service.process(buildEvent({}));

    expect(api.getActivity).toHaveBeenCalledWith('access-token', '42');
    expect(activities.upsertFromProvider).toHaveBeenCalledWith(
      'user-id',
      'strava',
      '42',
      expect.objectContaining({ sportType: 'run', distanceM: 10000 }),
    );
    expect(activities.keepMostRecentFromProvider).toHaveBeenCalledWith(
      'user-id',
      'strava',
      50,
    );
    expect(events.update).toHaveBeenCalledWith(
      'event-id',
      expect.objectContaining({ processedAt: expect.any(Date) as Date }),
    );
  });

  it('removes an activity that Strava no longer returns', async () => {
    api.getActivity.mockRejectedValue(new StravaApiError(404, 'Not Found'));

    await service.process(buildEvent({ aspectType: 'delete' }));

    expect(activities.removeFromProvider).toHaveBeenCalledWith(
      'user-id',
      'strava',
      ['42'],
    );
  });

  it('keeps an activity a forged delete event targets', async () => {
    api.getActivity.mockResolvedValue({
      id: 42,
      name: 'Still here',
      sport_type: 'Ride',
      start_date: '2026-10-12T07:30:00Z',
      distance: 1,
      moving_time: 1,
      elapsed_time: 1,
    });

    await service.process(buildEvent({ aspectType: 'delete' }));

    expect(activities.removeFromProvider).not.toHaveBeenCalled();
    expect(activities.upsertFromProvider).toHaveBeenCalled();
  });

  it('deletes the data once Strava confirms a deauthorization', async () => {
    connections.accessToken.mockRejectedValue(
      new StravaAuthorizationRevokedError(),
    );

    await service.process(
      buildEvent({ objectType: 'athlete', updates: { authorized: 'false' } }),
    );

    expect(connections.accessToken).toHaveBeenCalledWith('connection-id', {
      force: true,
    });
    expect(connections.handleRevoked).toHaveBeenCalledWith(connection);
  });

  it('ignores a deauthorization Strava does not confirm', async () => {
    await service.process(
      buildEvent({ objectType: 'athlete', updates: { authorized: 'false' } }),
    );

    expect(connections.handleRevoked).not.toHaveBeenCalled();
  });

  it('ignores events of athletes without a connection', async () => {
    connections.findByAthlete.mockResolvedValue(null);

    await service.process(buildEvent({}));

    expect(api.getActivity).not.toHaveBeenCalled();
    expect(events.update).toHaveBeenCalled();
  });

  it('postpones the event until the quota resets', async () => {
    const retryAt = new Date('2026-10-15T10:15:00Z');
    api.getActivity.mockRejectedValue(new StravaRateLimitedError(retryAt));

    await service.process(buildEvent({}));

    expect(events.update).toHaveBeenCalledWith('event-id', {
      runAfter: retryAt,
      attempts: 0,
    });
  });
});
