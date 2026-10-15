import type { ActivitiesService } from '../../activities/activities.service';
import type { StravaConfig } from '../../config/strava.config';
import type { ProviderConnection } from '../../connections/provider-connection.entity';
import type { SyncJob } from '../../connections/sync-job.entity';
import type { SyncJobsService } from '../../connections/sync-jobs.service';
import type { StravaApiClient } from '../api/strava-api.client';
import {
  StravaAuthorizationRevokedError,
  StravaRateLimitedError,
} from '../api/strava-api.errors';
import type { StravaActivity } from '../api/strava-api.types';
import type { StravaConnectionService } from '../strava-connection.service';
import { StravaSyncService } from './strava-sync.service';

const connection = {
  id: 'connection-id',
  userId: 'user-id',
} as ProviderConnection;

function stravaActivities(count: number, firstId = 1): StravaActivity[] {
  return Array.from({ length: count }, (_, index) => ({
    id: firstId + index,
    name: `Activity ${firstId + index}`,
    sport_type: 'Run',
    start_date: '2026-10-12T07:30:00Z',
    distance: 1000,
    moving_time: 300,
    elapsed_time: 320,
  }));
}

function buildJob(overrides: Partial<SyncJob> = {}): SyncJob {
  return {
    id: 'job-id',
    connectionId: 'connection-id',
    kind: 'backfill',
    processed: 0,
    total: null,
    nextPage: 1,
    attempts: 1,
    ...overrides,
  } as SyncJob;
}

describe('StravaSyncService', () => {
  let config: StravaConfig;
  let api: jest.Mocked<Pick<StravaApiClient, 'listActivities'>>;
  let connections: jest.Mocked<
    Pick<
      StravaConnectionService,
      'findById' | 'accessToken' | 'markSynced' | 'handleRevoked'
    >
  >;
  let activities: jest.Mocked<
    Pick<
      ActivitiesService,
      | 'upsertFromProvider'
      | 'removeMissingFromProvider'
      | 'keepMostRecentFromProvider'
    >
  >;
  let syncJobs: jest.Mocked<
    Pick<SyncJobsService, 'saveProgress' | 'complete' | 'defer' | 'fail'>
  >;
  let service: StravaSyncService;

  beforeEach(() => {
    config = {
      syncMaxActivities: 50,
      reconcileWindowDays: 30,
    } as StravaConfig;
    api = { listActivities: jest.fn() };
    connections = {
      findById: jest.fn().mockResolvedValue(connection),
      accessToken: jest.fn().mockResolvedValue('access-token'),
      markSynced: jest.fn(),
      handleRevoked: jest.fn(),
    };
    activities = {
      upsertFromProvider: jest.fn(),
      removeMissingFromProvider: jest.fn().mockResolvedValue(0),
      keepMostRecentFromProvider: jest.fn().mockResolvedValue(0),
    };
    syncJobs = {
      saveProgress: jest.fn(),
      complete: jest.fn(),
      defer: jest.fn(),
      fail: jest.fn(),
    };
    service = new StravaSyncService(
      config,
      api as unknown as StravaApiClient,
      connections as unknown as StravaConnectionService,
      activities as unknown as ActivitiesService,
      syncJobs as unknown as SyncJobsService,
    );
  });

  it('imports at most the configured number of activities', async () => {
    api.listActivities.mockResolvedValue(stravaActivities(50));

    await service.run(buildJob());

    expect(api.listActivities).toHaveBeenCalledTimes(1);
    expect(api.listActivities).toHaveBeenCalledWith('access-token', {
      page: 1,
      perPage: 50,
    });
    expect(activities.upsertFromProvider).toHaveBeenCalledTimes(50);
    expect(syncJobs.saveProgress).toHaveBeenLastCalledWith(expect.anything(), {
      processed: 50,
      total: 50,
      nextPage: 2,
    });
    expect(connections.markSynced).toHaveBeenCalledWith('connection-id');
    expect(syncJobs.complete).toHaveBeenCalled();
  });

  it('pages through the whole history without a maximum', async () => {
    config.syncMaxActivities = null;
    api.listActivities
      .mockResolvedValueOnce(stravaActivities(200))
      .mockResolvedValueOnce(stravaActivities(30, 201));

    await service.run(buildJob());

    expect(api.listActivities).toHaveBeenCalledTimes(2);
    expect(activities.upsertFromProvider).toHaveBeenCalledTimes(230);
    expect(syncJobs.saveProgress).toHaveBeenLastCalledWith(expect.anything(), {
      processed: 230,
      total: 230,
      nextPage: 3,
    });
  });

  it('resumes an interrupted import at its page without double counting', async () => {
    config.syncMaxActivities = null;
    api.listActivities.mockResolvedValue(stravaActivities(10, 401));

    await service.run(buildJob({ nextPage: 3, processed: 415 }));

    expect(api.listActivities).toHaveBeenCalledWith('access-token', {
      page: 3,
      perPage: 200,
    });
    expect(syncJobs.saveProgress).toHaveBeenLastCalledWith(expect.anything(), {
      processed: 410,
      total: 410,
      nextPage: 4,
    });
  });

  it('removes the recent activities deleted at Strava when reconciling', async () => {
    api.listActivities.mockResolvedValue(stravaActivities(2, 7));

    await service.run(buildJob({ kind: 'reconcile' }));

    expect(api.listActivities).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({ after: expect.any(Date) as Date }),
    );
    expect(activities.removeMissingFromProvider).toHaveBeenCalledWith(
      'user-id',
      'strava',
      expect.any(Date),
      ['7', '8'],
    );
  });

  it('keeps at most the configured number of activities after a reconciliation', async () => {
    api.listActivities.mockResolvedValue(stravaActivities(85));

    await service.run(buildJob({ kind: 'reconcile' }));

    expect(activities.keepMostRecentFromProvider).toHaveBeenCalledWith(
      'user-id',
      'strava',
      50,
    );
  });

  it('keeps every activity without a maximum', async () => {
    config.syncMaxActivities = null;
    api.listActivities.mockResolvedValue(stravaActivities(3));

    await service.run(buildJob({ kind: 'reconcile' }));

    expect(activities.keepMostRecentFromProvider).not.toHaveBeenCalled();
  });

  it('waits for the quota instead of failing', async () => {
    const retryAt = new Date('2026-10-15T10:15:00Z');
    api.listActivities.mockRejectedValue(new StravaRateLimitedError(retryAt));

    await service.run(buildJob());

    expect(syncJobs.defer).toHaveBeenCalledWith(
      expect.anything(),
      retryAt,
      'RATE_LIMITED',
    );
    expect(syncJobs.complete).not.toHaveBeenCalled();
  });

  it('deletes the data when Strava rejects the refresh token', async () => {
    connections.accessToken.mockRejectedValue(
      new StravaAuthorizationRevokedError(),
    );

    await service.run(buildJob());

    expect(connections.handleRevoked).toHaveBeenCalledWith(connection);
    expect(syncJobs.fail).not.toHaveBeenCalled();
  });
});
