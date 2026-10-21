import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ActivitiesService } from '../activities/activities.service';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { Badge } from './badge.entity';
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
} from './distance-progress';
import { favoriteOrder } from './favorite-order';
import { UserFavoriteBadge } from './user-favorite-badge.entity';

export type BadgeView = Omit<Badge, 'createdAt' | 'position' | 'theme'> &
  BadgeProgress & {
    /** Rank among the favorites, from 1; null when not a favorite. */
    favoritePosition: number | null;
    /** When the badge joined the catalog. */
    addedAt: Date;
  };

export interface DistancesOverview {
  /** Cumulated distance per family, in meters. */
  totals: Record<DistanceFamily, number>;
  /** Themes having badges, in display order. */
  themes: Pick<BadgeTheme, 'id' | 'name'>[];
  /** Every badge, in display order. */
  badges: BadgeView[];
}

export interface BadgeDetails extends BadgeView {
  /** Distance covered by the family of the badge, in meters. */
  familyTotalM: number;
  /** Distance left before the next iteration, in meters. */
  remainingM: number;
  /** At the recent pace of the family; null without recent activity. */
  estimatedNextAt: Date | null;
  /** Every completed iteration, the latest first. */
  history: BadgeCompletion[];
}

/** Badges of known distances, compared to the cumulated distances of a user. */
@Injectable()
export class DistancesService {
  constructor(
    private readonly activities: ActivitiesService,
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
        DISTANCE_FAMILIES.map((family) => [
          family,
          timelineTotal(timelines[family]),
        ]),
      ) as Record<DistanceFamily, number>,
      themes: themes
        .filter((theme) => usedThemes.has(theme.id))
        .map(({ id, name }) => ({ id, name })),
      badges: badges.map((badge) =>
        this.view(
          badge,
          timelines[badge.family],
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
    const timeline = timelines[badge.family];
    const view = this.view(badge, timeline, favorites.get(badge.id) ?? null);
    return {
      ...view,
      familyTotalM: timelineTotal(timeline),
      remainingM: (1 - view.progress) * badge.distanceM,
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

  private async timelines(
    userId: string,
  ): Promise<Record<DistanceFamily, FamilyTimeline>> {
    return familyTimelines(await this.activities.distanceTimeline(userId));
  }

  private view(
    badge: Badge,
    timeline: FamilyTimeline,
    favoritePosition: number | null,
  ): BadgeView {
    const { id, family, distanceM, name, description, icon, themeId } = badge;
    return {
      id,
      family,
      distanceM,
      name,
      description,
      icon,
      themeId,
      ...badgeProgress(badge, timeline),
      favoritePosition,
      addedAt: badge.createdAt,
    };
  }
}
