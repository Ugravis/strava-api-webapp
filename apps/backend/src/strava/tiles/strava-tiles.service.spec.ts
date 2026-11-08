import type { DataSource } from 'typeorm';
import type { ActivityData } from '../../activities/activities.service';
import type { PendingStream, TilesService } from '../../tiles/tiles.service';
import type { StravaApiClient } from '../api/strava-api.client';
import {
  StravaApiError,
  StravaRateLimitedError,
} from '../api/strava-api.errors';
import type { StravaActivity } from '../api/strava-api.types';
import type { StravaRateLimiter } from '../api/strava-rate-limiter';
import type { StravaConnectionService } from '../strava-connection.service';
import { StravaTilesService } from './strava-tiles.service';

// Three points 100 m apart, eastward near Troyes.
const POLYLINE = '_rxeH_{{W?mG?mG';

const outdoor: ActivityData = {
  sportType: 'run',
  name: 'Run',
  startedAt: new Date('2026-10-12T07:30:00Z'),
  timezone: null,
  distanceM: 300,
  movingTimeS: 100,
  elapsedTimeS: 100,
  elevationGainM: null,
  indoor: false,
  manual: false,
};

function stravaActivity(
  overrides: Partial<StravaActivity> = {},
): StravaActivity {
  return {
    id: 1,
    name: 'Run',
    sport_type: 'Run',
    start_date: '2026-10-12T07:30:00Z',
    distance: 300,
    moving_time: 100,
    elapsed_time: 100,
    map: { summary_polyline: POLYLINE },
    ...overrides,
  };
}

const pending: PendingStream = {
  activityId: 'activity-id',
  userId: 'user-id',
  reason: 'cropped',
  hiddenStartM: 300,
  hiddenEndM: 0,
  attempts: 1,
};

describe('StravaTilesService', () => {
  let tiles: jest.Mocked<
    Pick<
      TilesService,
      | 'handled'
      | 'markNoTrack'
      | 'saveFromSummary'
      | 'saveFromStream'
      | 'claimNextStream'
      | 'hiddenAreasCovered'
      | 'complete'
      | 'defer'
    >
  >;
  let api: jest.Mocked<Pick<StravaApiClient, 'getLatLngStream'>>;
  let rateLimiter: jest.Mocked<Pick<StravaRateLimiter, 'hasCapacity'>>;
  let connections: jest.Mocked<
    Pick<
      StravaConnectionService,
      'findForUser' | 'accessToken' | 'handleRevoked'
    >
  >;
  let dataSource: jest.Mocked<Pick<DataSource, 'query'>>;
  let service: StravaTilesService;

  beforeEach(() => {
    tiles = {
      handled: jest.fn().mockResolvedValue(new Set()),
      markNoTrack: jest.fn(),
      saveFromSummary: jest.fn(),
      saveFromStream: jest.fn(),
      claimNextStream: jest.fn().mockResolvedValue(pending),
      hiddenAreasCovered: jest.fn().mockResolvedValue(false),
      complete: jest.fn(),
      defer: jest.fn(),
    };
    api = { getLatLngStream: jest.fn() };
    rateLimiter = { hasCapacity: jest.fn().mockReturnValue(true) };
    connections = {
      findForUser: jest.fn().mockResolvedValue({ id: 'connection-id' }),
      accessToken: jest.fn().mockResolvedValue('access-token'),
      handleRevoked: jest.fn(),
    };
    dataSource = {
      query: jest.fn().mockResolvedValue([{ external_id: '42' }]),
    };
    service = new StravaTilesService(
      tiles as unknown as TilesService,
      api as unknown as StravaApiClient,
      rateLimiter as unknown as StravaRateLimiter,
      connections as unknown as StravaConnectionService,
      dataSource as unknown as DataSource,
    );
  });

  describe('fromSummaries', () => {
    it('keeps the tiles already computed', async () => {
      tiles.handled.mockResolvedValue(new Set(['activity-id']));

      await service.fromSummaries('user-id', [
        {
          activityId: 'activity-id',
          activity: stravaActivity(),
          data: outdoor,
        },
      ]);

      expect(tiles.saveFromSummary).not.toHaveBeenCalled();
    });

    it('expects no track from indoor activities', async () => {
      await service.fromSummaries('user-id', [
        {
          activityId: 'activity-id',
          activity: stravaActivity(),
          data: { ...outdoor, indoor: true },
        },
      ]);

      expect(tiles.markNoTrack).toHaveBeenCalledWith('activity-id');
    });

    it('needs nothing more for an accurate, uncropped summary', async () => {
      await service.fromSummaries('user-id', [
        {
          activityId: 'activity-id',
          activity: stravaActivity(),
          data: outdoor,
        },
      ]);

      expect(tiles.saveFromSummary).toHaveBeenCalledWith(
        'user-id',
        'activity-id',
        expect.anything(),
        expect.objectContaining({ sparse: false, hiddenStartM: 0 }),
        null,
      );
    });

    it('queues the full track of a cropped summary', async () => {
      await service.fromSummaries('user-id', [
        {
          activityId: 'activity-id',
          // About 300 m west of the first point of the summary.
          activity: stravaActivity({ start_latlng: [48.3, 4.076] }),
          data: outdoor,
        },
      ]);

      expect(tiles.saveFromSummary).toHaveBeenCalledWith(
        'user-id',
        'activity-id',
        expect.anything(),
        expect.anything(),
        'cropped',
      );
    });

    it('queues the full track of a sparse summary', async () => {
      await service.fromSummaries('user-id', [
        {
          activityId: 'activity-id',
          activity: stravaActivity({ distance: 150_000 }),
          data: outdoor,
        },
      ]);

      expect(tiles.saveFromSummary).toHaveBeenCalledWith(
        'user-id',
        'activity-id',
        expect.anything(),
        expect.anything(),
        'sparse',
      );
    });
  });

  describe('refineNext', () => {
    it('leaves the quota to the synchronization once its share is used', async () => {
      rateLimiter.hasCapacity.mockReturnValue(false);

      await expect(service.refineNext()).resolves.toBe(false);
      expect(tiles.claimNextStream).not.toHaveBeenCalled();
    });

    it('skips the request when the hidden areas are already covered', async () => {
      tiles.hiddenAreasCovered.mockResolvedValue(true);

      await expect(service.refineNext()).resolves.toBe(true);
      expect(api.getLatLngStream).not.toHaveBeenCalled();
      expect(tiles.complete).toHaveBeenCalledWith('activity-id');
    });

    it('refines the tiles with the full track', async () => {
      api.getLatLngStream.mockResolvedValue([
        [48.3, 4.08],
        [48.3, 4.09],
      ]);

      await service.refineNext();

      expect(api.getLatLngStream).toHaveBeenCalledWith('access-token', '42');
      const [, refined] = tiles.saveFromStream.mock.calls[0];
      expect(refined.visited.isEmpty).toBe(false);
    });

    it('waits for the quota when Strava rate limits', async () => {
      const retryAt = new Date('2026-10-15T12:15:00Z');
      api.getLatLngStream.mockRejectedValue(
        new StravaRateLimitedError(retryAt),
      );

      await service.refineNext();

      expect(tiles.defer).toHaveBeenCalledWith('activity-id', retryAt);
    });

    it('keeps the summary tiles of an activity gone from Strava', async () => {
      api.getLatLngStream.mockRejectedValue(
        new StravaApiError(404, 'Not Found'),
      );

      await service.refineNext();

      expect(tiles.complete).toHaveBeenCalledWith('activity-id');
    });
  });
});
