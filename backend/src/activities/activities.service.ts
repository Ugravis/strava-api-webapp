import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, Repository } from 'typeorm';
import { Activity } from './activity.entity';
import {
  ActivitySource,
  type ActivityProvider,
} from './activity-source.entity';
import { type SportType, VIRTUAL_SPORT_TYPES } from './sport-type';

/** Canonical fields of an activity, as produced by a provider mapper. */
export type ActivityData = Pick<
  Activity,
  | 'sportType'
  | 'name'
  | 'startedAt'
  | 'timezone'
  | 'distanceM'
  | 'movingTimeS'
  | 'elapsedTimeS'
  | 'elevationGainM'
  | 'indoor'
  | 'manual'
>;

export interface ActivityStats {
  count: number;
  totalDistanceM: number;
  totalElevationGainM: number;
  totalMovingTimeS: number;
}

/** An activity expected to have a real-world track. */
export interface MappableActivity {
  id: string;
  startedAt: Date;
}

/** Total distance of a user per sport type; absent sports have no activity. */
export type DistanceBySportType = Partial<Record<SportType, number>>;

/** Provider-agnostic storage of activities and of their provider sources. */
@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activities: Repository<Activity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** Creates or updates the activity known at `provider` as `externalId`. Idempotent. */
  async upsertFromProvider(
    userId: string,
    provider: ActivityProvider,
    externalId: string,
    data: ActivityData,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const fetchedAt = new Date();
      const source = await manager.findOneBy(ActivitySource, {
        provider,
        externalId,
      });
      if (source) {
        await manager.update(Activity, source.activityId, { ...data, userId });
        await manager.update(ActivitySource, source.id, { fetchedAt });
        return;
      }
      const activity = await manager.save(
        manager.create(Activity, { ...data, userId }),
      );
      await manager.insert(ActivitySource, {
        activityId: activity.id,
        provider,
        externalId,
        fetchedAt,
      });
    });
  }

  /** Removes the given provider activities of a user, or all of them when no list is given. */
  removeFromProvider(
    userId: string,
    provider: ActivityProvider,
    externalIds?: string[],
  ): Promise<number> {
    const filter = externalIds ? 'AND s.external_id = ANY($3)' : '';
    const parameters: unknown[] = [userId, provider];
    if (externalIds) {
      parameters.push(externalIds);
    }
    return this.deleteSources(filter, parameters);
  }

  /**
   * Removes the provider activities started since `since` that are absent
   * from `keptExternalIds`: they were deleted at the provider.
   */
  removeMissingFromProvider(
    userId: string,
    provider: ActivityProvider,
    since: Date,
    keptExternalIds: string[],
  ): Promise<number> {
    return this.deleteSources(
      'AND a.started_at >= $3 AND NOT (s.external_id = ANY($4))',
      [userId, provider, since, keptExternalIds],
    );
  }

  /** Keeps only the `max` most recent provider activities of a user. */
  keepMostRecentFromProvider(
    userId: string,
    provider: ActivityProvider,
    max: number,
  ): Promise<number> {
    return this.deleteSources(
      `AND s.activity_id NOT IN (
         SELECT recent.id FROM activities recent
         JOIN activity_sources rs ON rs.activity_id = recent.id
         WHERE recent.user_id = $1 AND rs.provider = $2
         ORDER BY recent.started_at DESC
         LIMIT $3
       )`,
      [userId, provider, max],
    );
  }

  async stats(userId: string): Promise<ActivityStats> {
    const row = await this.activities
      .createQueryBuilder('activity')
      .select('COUNT(*)::int', 'count')
      .addSelect(
        'COALESCE(SUM(activity.distance_m), 0)::float8',
        'totalDistanceM',
      )
      .addSelect(
        'COALESCE(SUM(activity.elevation_gain_m), 0)::float8',
        'totalElevationGainM',
      )
      .addSelect(
        'COALESCE(SUM(activity.moving_time_s), 0)::float8',
        'totalMovingTimeS',
      )
      .where('activity.user_id = :userId', { userId })
      .getRawOne<ActivityStats>();
    return (
      row ?? {
        count: 0,
        totalDistanceM: 0,
        totalElevationGainM: 0,
        totalMovingTimeS: 0,
      }
    );
  }

  /** Activities that may have a track: recorded outdoors, in the real world. */
  mappable(userId: string): Promise<MappableActivity[]> {
    return this.activities
      .createQueryBuilder('activity')
      .select(['activity.id', 'activity.startedAt'])
      .where('activity.user_id = :userId', { userId })
      .andWhere('activity.indoor = false AND activity.manual = false')
      .andWhere('activity.sport_type NOT IN (:...virtual)', {
        virtual: VIRTUAL_SPORT_TYPES,
      })
      .orderBy('activity.started_at', 'DESC')
      .getMany();
  }

  /** Activity ids of a user, keyed by their identifier at `provider`. */
  async idsByExternalId(
    userId: string,
    provider: ActivityProvider,
    externalIds: string[],
  ): Promise<Map<string, string>> {
    if (externalIds.length === 0) {
      return new Map();
    }
    const rows = await this.dataSource
      .getRepository(ActivitySource)
      .createQueryBuilder('source')
      .innerJoin('source.activity', 'activity')
      .select('source.external_id', 'externalId')
      .addSelect('source.activity_id', 'activityId')
      .where('activity.user_id = :userId', { userId })
      .andWhere('source.provider = :provider', { provider })
      .andWhere('source.external_id IN (:...externalIds)', { externalIds })
      .getRawMany<{ externalId: string; activityId: string }>();
    return new Map(rows.map((row) => [row.externalId, row.activityId]));
  }

  async distanceBySportType(userId: string): Promise<DistanceBySportType> {
    const rows = await this.activities
      .createQueryBuilder('activity')
      .select('activity.sport_type', 'sportType')
      .addSelect('SUM(activity.distance_m)::float8', 'distanceM')
      .where('activity.user_id = :userId', { userId })
      .groupBy('activity.sport_type')
      .getRawMany<{ sportType: SportType; distanceM: number }>();
    return Object.fromEntries(
      rows.map((row) => [row.sportType, row.distanceM]),
    );
  }

  /**
   * Deletes matching sources (`s`, joined to their activity `a`; `$1` is the
   * user, `$2` the provider), then the activities left without any source.
   * Returns the number of deleted activities.
   */
  private deleteSources(
    filter: string,
    parameters: unknown[],
  ): Promise<number> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      // PostgreSQL DELETE ... RETURNING resolves to [rows, row count].
      const [deleted]: [{ activity_id: string }[], number] =
        await manager.query(
          `DELETE FROM activity_sources s USING activities a
         WHERE s.activity_id = a.id AND a.user_id = $1 AND s.provider = $2 ${filter}
         RETURNING s.activity_id`,
          parameters,
        );
      if (deleted.length === 0) {
        return 0;
      }
      const [, orphanCount]: [unknown[], number] = await manager.query(
        `DELETE FROM activities a
         WHERE a.id = ANY($1)
           AND NOT EXISTS (SELECT 1 FROM activity_sources s WHERE s.activity_id = a.id)`,
        [deleted.map((row) => row.activity_id)],
      );
      return orphanCount;
    });
  }
}
