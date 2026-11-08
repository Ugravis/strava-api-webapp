import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, Repository } from 'typeorm';
import { Activity } from './activity.entity';
import { FAMILY_SPORT_TYPES } from '../distances/distance-families';
import {
  type ActivityDay,
  activityDays,
  type MonthDistance,
  type MonthlyFamily,
  monthlyDistances,
} from './activity-days';
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

/** An activity of the user, as shown on its own. */
export interface ActivityDetails {
  id: string;
  name: string;
  sportType: SportType;
  startedAt: string;
  /** IANA time zone of the start. */
  timezone: string | null;
  distanceM: number;
  movingTimeS: number;
  elapsedTimeS: number;
  elevationGainM: number | null;
  /** Identifier of the activity on Strava, to link to it. */
  stravaId: string | null;
}

/** An activity in the list of the latest ones. */
export type RecentActivity = Omit<
  ActivityDetails,
  'timezone' | 'elapsedTimeS' | 'stravaId'
>;

/** Totals of one sport over every activity. */
export interface SportTotals {
  sportType: SportType;
  count: number;
  distanceM: number;
  movingTimeS: number;
}

export type { ActivityDay, MonthDistance };

/** What the home page shows of the activities, besides their totals. */
export interface ActivitiesOverview {
  /** Latest activities, the most recent first. */
  recent: RecentActivity[];
  /** Days with activities over the last `OVERVIEW_DAYS` days, oldest first. */
  days: ActivityDay[];
  /** Sports practiced, the most practiced (by moving time) first. */
  sports: SportTotals[];
  /** Start of the first activity, ISO 8601; null without activities. */
  firstActivityAt: string | null;
}

/** Latest activities listed on the home page. */
const RECENT_COUNT = 6;
/** Days covered by the calendar of the home page: 53 weeks, plus margin for the time zones. */
export const OVERVIEW_DAYS = 373;

/** What the badges need of an activity: no location. */
export type ActivityTotals = Pick<
  Activity,
  | 'id'
  | 'name'
  | 'sportType'
  | 'startedAt'
  | 'distanceM'
  | 'movingTimeS'
  | 'elevationGainM'
>;

/** Provider-agnostic storage of activities and of their provider sources. */
@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activities: Repository<Activity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** One activity of the user; null when the user has no such activity. */
  async details(
    userId: string,
    activityId: string,
  ): Promise<ActivityDetails | null> {
    const activity = await this.activities.findOne({
      where: { id: activityId, userId },
      relations: { sources: true },
    });
    if (!activity) return null;
    return {
      id: activity.id,
      name: activity.name,
      sportType: activity.sportType,
      startedAt: activity.startedAt.toISOString(),
      timezone: activity.timezone,
      distanceM: activity.distanceM,
      movingTimeS: activity.movingTimeS,
      elapsedTimeS: activity.elapsedTimeS,
      elevationGainM: activity.elevationGainM,
      stravaId:
        activity.sources?.find((source) => source.provider === 'strava')
          ?.externalId ?? null,
    };
  }

  /**
   * Creates or updates the activity known at `provider` as `externalId`.
   * Idempotent. Returns the identifier of the activity.
   */
  upsertFromProvider(
    userId: string,
    provider: ActivityProvider,
    externalId: string,
    data: ActivityData,
  ): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const fetchedAt = new Date();
      const source = await manager.findOneBy(ActivitySource, {
        provider,
        externalId,
      });
      if (source) {
        await manager.update(Activity, source.activityId, { ...data, userId });
        await manager.update(ActivitySource, source.id, { fetchedAt });
        return source.activityId;
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
      return activity.id;
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

  /** Latest activities, daily totals of the last year and totals per sport. */
  async overview(userId: string): Promise<ActivitiesOverview> {
    const since = new Date(Date.now() - OVERVIEW_DAYS * 24 * 3600 * 1000);
    const [recent, lastYear, sports, first] = await Promise.all([
      this.activities.find({
        select: {
          id: true,
          name: true,
          sportType: true,
          startedAt: true,
          distanceM: true,
          movingTimeS: true,
          elevationGainM: true,
        },
        where: { userId },
        order: { startedAt: 'DESC', id: 'DESC' },
        take: RECENT_COUNT,
      }),
      this.activities
        .createQueryBuilder('activity')
        .select([
          'activity.startedAt',
          'activity.timezone',
          'activity.distanceM',
          'activity.movingTimeS',
        ])
        .where('activity.user_id = :userId', { userId })
        .andWhere('activity.started_at >= :since', { since })
        .getMany(),
      this.activities
        .createQueryBuilder('activity')
        .select('activity.sport_type', 'sportType')
        .addSelect('COUNT(*)::int', 'count')
        .addSelect('COALESCE(SUM(activity.distance_m), 0)::float8', 'distanceM')
        .addSelect(
          'COALESCE(SUM(activity.moving_time_s), 0)::float8',
          'movingTimeS',
        )
        .where('activity.user_id = :userId', { userId })
        .groupBy('activity.sport_type')
        .orderBy('"movingTimeS"', 'DESC')
        .getRawMany<SportTotals>(),
      this.activities.findOne({
        select: { startedAt: true },
        where: { userId },
        order: { startedAt: 'ASC' },
      }),
    ]);
    return {
      recent: recent.map((activity) => ({
        id: activity.id,
        name: activity.name,
        sportType: activity.sportType,
        startedAt: activity.startedAt.toISOString(),
        distanceM: activity.distanceM,
        movingTimeS: activity.movingTimeS,
        elevationGainM: activity.elevationGainM,
      })),
      days: activityDays(lastYear),
      sports,
      firstActivityAt: first?.startedAt.toISOString() ?? null,
    };
  }

  /** Distance of every month since the first activity, in total and by family of sports. */
  async monthly(userId: string): Promise<MonthDistance[]> {
    const activities = await this.activities.find({
      select: {
        startedAt: true,
        timezone: true,
        sportType: true,
        distanceM: true,
      },
      where: { userId },
    });
    const families = Object.entries(FAMILY_SPORT_TYPES) as [
      MonthlyFamily,
      readonly SportType[],
    ][];
    return monthlyDistances(
      activities,
      (sportType) =>
        families.find(([, sports]) => sports.includes(sportType))?.[0] ??
        'other',
    );
  }

  /**
   * Days with activities of a calendar year, from the November before it:
   * the calendar of the year starts up to two months earlier.
   */
  async yearDays(userId: string, year: number): Promise<ActivityDay[]> {
    const from = `${year - 1}-11-01`;
    const to = `${year}-12-31`;
    // A day of margin on both sides for the time zones.
    const activities = await this.activities
      .createQueryBuilder('activity')
      .select([
        'activity.startedAt',
        'activity.timezone',
        'activity.distanceM',
        'activity.movingTimeS',
      ])
      .where('activity.user_id = :userId', { userId })
      .andWhere('activity.started_at >= :start', {
        start: new Date(`${year - 1}-10-31T00:00:00Z`),
      })
      .andWhere('activity.started_at < :end', {
        end: new Date(`${year + 1}-01-02T00:00:00Z`),
      })
      .getMany();
    return activityDays(activities).filter(
      (day) => day.date >= from && day.date <= to,
    );
  }

  /**
   * Entity tag of the activities of a user: it changes whenever one is
   * added, changed or deleted, so that the list of the mappable activities
   * is only downloaded again when it may have changed.
   */
  async listTag(userId: string): Promise<string> {
    const [row]: { count: number; updated: string | null }[] =
      await this.activities.query(
        `SELECT count(*)::int AS count,
           floor(extract(epoch FROM max(updated_at)) * 1000)::bigint::text AS updated
         FROM activities WHERE user_id = $1`,
        [userId],
      );
    return `"${row.count}-${row.updated ?? 0}"`;
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

  /**
   * Every activity of a user, oldest first, as the badges need it.
   */
  totalsTimeline(userId: string): Promise<ActivityTotals[]> {
    return this.activities.find({
      select: {
        id: true,
        name: true,
        sportType: true,
        startedAt: true,
        distanceM: true,
        movingTimeS: true,
        elevationGainM: true,
      },
      where: { userId },
      order: { startedAt: 'ASC', id: 'ASC' },
    });
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
