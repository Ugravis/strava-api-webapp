import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ActivitiesService } from '../activities/activities.service';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { StationsService } from '../stations/stations.service';
import { Badge } from './badge.entity';
import { BADGE_METRICS, type BadgeMetric } from './badge-metrics';
import { BadgeTheme } from './badge-theme.entity';
import { DISTANCE_FAMILIES, type DistanceFamily } from './distance-families';
import {
  badgeCompletions,
  badgeProgress,
  estimatedNextCompletion,
  familyTimelines,
  timelineTotal,
  type BadgeCompletion,
  type BadgeProgress,
  type FamilyTimeline,
  type MetricEvent,
} from './distance-progress';
import { favoriteOrder } from './favorite-order';
import { activityEvents, isActivityMetric } from './metric-events';
import { UserFavoriteBadge } from './user-favorite-badge.entity';

/** Background of a badge card: a color or an image. */
export type BadgeBackground =
  { kind: 'color'; color: string } | { kind: 'image'; url: string };

export type BadgeView = Omit<
  Badge,
  | 'createdAt'
  | 'position'
  | 'theme'
  | 'target'
  | 'backgroundColor'
  | 'backgroundImage'
> &
  BadgeProgress & {
    /** Background of the card; null for the default one. */
    background: BadgeBackground | null;
    /** When the badge joined the catalog. */
    addedAt: Date;
    /** Rank among the favorites, from 1; null when not a favorite. */
    favoritePosition: number | null;
  };

function backgroundOf(badge: Badge): BadgeBackground | null {
  if (badge.backgroundColor)
    return { kind: 'color', color: badge.backgroundColor };
  if (badge.backgroundImage)
    return { kind: 'image', url: badge.backgroundImage };
  return null;
}

type MetricTimelines = Record<
  BadgeMetric,
  Record<DistanceFamily, FamilyTimeline>
>;

export interface DistancesOverview {
  /** Cumulated amount per metric and family, in the unit of the metric. */
  totals: Record<BadgeMetric, Record<DistanceFamily, number>>;
  /** Themes having badges, in display order. */
  themes: Pick<BadgeTheme, 'id' | 'name'>[];
  /** Every badge, in display order. */
  badges: BadgeView[];
}

export interface BadgeDetails extends BadgeView {
  /** Amount reached by the family of the badge, in the unit of its metric. */
  familyTotal: number;
  /** Amount left before the next iteration, in the unit of its metric. */
  remaining: number;
  /** At the recent pace of the family; null without recent activity. */
  estimatedNextAt: Date | null;
  /** Every completed iteration, the latest first. */
  history: BadgeCompletion[];
}

/** Badges of known amounts, compared to the cumulated amounts of a user. */
@Injectable()
export class DistancesService {
  constructor(
    private readonly activities: ActivitiesService,
    private readonly stations: StationsService,
    @InjectRepository(Badge) private readonly badges: Repository<Badge>,
    @InjectRepository(BadgeTheme)
    private readonly themes: Repository<BadgeTheme>,
    @InjectRepository(UserFavoriteBadge)
    private readonly favorites: Repository<UserFavoriteBadge>,
    private readonly dataSource: DataSource,
  ) {}

  async overview(userId: string): Promise<DistancesOverview> {
    const [badges, themes, favorites, timelines] = await Promise.all([
      this.badges.find({ order: { position: 'ASC', id: 'ASC' } }),
      this.themes.find({ order: { position: 'ASC', id: 'ASC' } }),
      this.favoritePositions(userId),
      this.timelines(userId),
    ]);
    const usedThemes = new Set(badges.map((badge) => badge.themeId));
    return {
      totals: Object.fromEntries(
        BADGE_METRICS.map((metric) => [
          metric,
          Object.fromEntries(
            DISTANCE_FAMILIES.map((family) => [
              family,
              timelineTotal(timelines[metric][family]),
            ]),
          ),
        ]),
      ) as DistancesOverview['totals'],
      themes: themes
        .filter((theme) => usedThemes.has(theme.id))
        .map(({ id, name }) => ({ id, name })),
      badges: badges.map((badge) =>
        this.view(
          badge,
          timelines[badge.metric][badge.family],
          favorites.get(badge.id) ?? null,
        ),
      ),
    };
  }

  async details(userId: string, badgeId: string): Promise<BadgeDetails> {
    const [badge, favorites, timelines] = await Promise.all([
      this.findBadge(badgeId),
      this.favoritePositions(userId),
      this.timelines(userId),
    ]);
    const timeline = timelines[badge.metric][badge.family];
    const view = this.view(badge, timeline, favorites.get(badge.id) ?? null);
    return {
      ...view,
      familyTotal: timelineTotal(timeline),
      remaining: Math.max(0, view.goal - view.covered),
      estimatedNextAt: estimatedNextCompletion(badge, timeline, new Date()),
      history: badgeCompletions(badge, timeline),
    };
  }

  /** Adds a badge to the favorites, last; adding it again keeps its rank. */
  async addFavorite(userId: string, badgeId: string): Promise<void> {
    await this.findBadge(badgeId);
    await this.favorites.query(
      `INSERT INTO user_favorite_badges (user_id, badge_id, position)
       SELECT $1, $2, COALESCE(MAX(position), 0) + 1
       FROM user_favorite_badges WHERE user_id = $1
       ON CONFLICT DO NOTHING`,
      [userId, badgeId],
    );
  }

  async removeFavorite(userId: string, badgeId: string): Promise<void> {
    await this.favorites.delete({ userId, badgeId });
  }

  /**
   * Ranks the favorites in the given order. Badges not in the favorites are
   * ignored, and favorites left out keep their order after the others.
   */
  async reorderFavorites(userId: string, badgeIds: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const favorites = await manager.find(UserFavoriteBadge, {
        where: { userId },
        order: { position: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const order = favoriteOrder(
        favorites.map((favorite) => favorite.badgeId),
        badgeIds,
      );
      await manager.query(
        `UPDATE user_favorite_badges f SET position = o.position
         FROM unnest($2::varchar[]) WITH ORDINALITY AS o(badge_id, position)
         WHERE f.user_id = $1 AND f.badge_id = o.badge_id`,
        [userId, order],
      );
    });
  }

  private async findBadge(id: string): Promise<Badge> {
    const badge = await this.badges.findOneBy({ id });
    if (!badge) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such badge');
    }
    return badge;
  }

  /** Ranks of the favorite badges, from 1 without gaps. */
  private async favoritePositions(
    userId: string,
  ): Promise<Map<string, number>> {
    const favorites = await this.favorites.find({
      where: { userId },
      order: { position: 'ASC', addedAt: 'ASC' },
    });
    return new Map(
      favorites.map((favorite, index) => [favorite.badgeId, index + 1]),
    );
  }

  private async timelines(userId: string): Promise<MetricTimelines> {
    const [activities, tiles, subtiles, stations] = await Promise.all([
      this.activities.totalsTimeline(userId),
      this.gainedTiles(userId, 'gained_tiles'),
      this.gainedTiles(userId, 'gained_subtiles'),
      this.stations.visitTimeline(userId),
    ]);
    const events = (metric: BadgeMetric): MetricEvent[] =>
      isActivityMetric(metric)
        ? activityEvents(metric, activities)
        : { tiles, subtiles, stations }[metric];
    return Object.fromEntries(
      BADGE_METRICS.map((metric) => [metric, familyTimelines(events(metric))]),
    ) as MetricTimelines;
  }

  /** Tiles (the `column` of the gains) each activity brought, oldest first. */
  private gainedTiles(
    userId: string,
    column: 'gained_tiles' | 'gained_subtiles',
  ): Promise<MetricEvent[]> {
    // Gained tiles are flattened [x, y] pairs.
    return this.dataSource.query(
      `SELECT a.id, a.name, a.sport_type AS "sportType",
         a.started_at AS "startedAt", cardinality(g.${column}) / 2 AS value
       FROM activity_gains g
       JOIN activities a ON a.id = g.activity_id
       WHERE g.user_id = $1 AND cardinality(g.${column}) > 0
       ORDER BY a.started_at, a.id`,
      [userId],
    );
  }

  private view(
    badge: Badge,
    timeline: FamilyTimeline,
    favoritePosition: number | null,
  ): BadgeView {
    const { id, metric, family, tiers, name, description, icon, themeId } =
      badge;
    return {
      id,
      metric,
      family,
      tiers,
      name,
      description,
      icon,
      themeId,
      background: backgroundOf(badge),
      addedAt: badge.createdAt,
      ...badgeProgress(badge, timeline),
      favoritePosition,
    };
  }
}
