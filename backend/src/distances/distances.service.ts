import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ActivitiesService } from '../activities/activities.service';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { Badge } from './badge.entity';
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
import { pinOrder } from './pin-order';
import { UserBadgePin } from './user-badge-pin.entity';

export type BadgeView = Omit<Badge, 'createdAt' | 'position'> &
  BadgeProgress & {
    /** Rank among the pinned badges, from 1; null when not pinned. */
    pinPosition: number | null;
  };

export interface DistancesOverview {
  /** Cumulated distance per family, in meters. */
  totals: Record<DistanceFamily, number>;
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
    @InjectRepository(UserBadgePin)
    private readonly pins: Repository<UserBadgePin>,
    private readonly dataSource: DataSource,
  ) {}

  async overview(userId: string): Promise<DistancesOverview> {
    const [badges, pins, timelines] = await Promise.all([
      this.badges.find({ order: { position: 'ASC', id: 'ASC' } }),
      this.pinPositions(userId),
      this.timelines(userId),
    ]);
    return {
      totals: Object.fromEntries(
        DISTANCE_FAMILIES.map((family) => [
          family,
          timelineTotal(timelines[family]),
        ]),
      ) as Record<DistanceFamily, number>,
      badges: badges.map((badge) =>
        this.view(badge, timelines[badge.family], pins.get(badge.id) ?? null),
      ),
    };
  }

  async details(userId: string, badgeId: string): Promise<BadgeDetails> {
    const [badge, pins, timelines] = await Promise.all([
      this.findBadge(badgeId),
      this.pinPositions(userId),
      this.timelines(userId),
    ]);
    const timeline = timelines[badge.family];
    const view = this.view(badge, timeline, pins.get(badge.id) ?? null);
    return {
      ...view,
      familyTotalM: timelineTotal(timeline),
      remainingM: (1 - view.progress) * badge.distanceM,
      estimatedNextAt: estimatedNextCompletion(badge, timeline, new Date()),
      history: badgeCompletions(badge, timeline),
    };
  }

  /** Pins a badge after the others; pinning it again keeps its rank. */
  async pin(userId: string, badgeId: string): Promise<void> {
    await this.findBadge(badgeId);
    await this.pins.query(
      `INSERT INTO user_badge_pins (user_id, badge_id, position)
       SELECT $1, $2, COALESCE(MAX(position), 0) + 1
       FROM user_badge_pins WHERE user_id = $1
       ON CONFLICT DO NOTHING`,
      [userId, badgeId],
    );
  }

  /**
   * Ranks the pinned badges in the given order. Badges not pinned are
   * ignored, and pinned badges left out keep their order after the others.
   */
  async reorderPins(userId: string, badgeIds: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const pins = await manager.find(UserBadgePin, {
        where: { userId },
        order: { position: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const order = pinOrder(
        pins.map((pin) => pin.badgeId),
        badgeIds,
      );
      await manager.query(
        `UPDATE user_badge_pins p SET position = o.position
         FROM unnest($2::varchar[]) WITH ORDINALITY AS o(badge_id, position)
         WHERE p.user_id = $1 AND p.badge_id = o.badge_id`,
        [userId, order],
      );
    });
  }

  async unpin(userId: string, badgeId: string): Promise<void> {
    await this.pins.delete({ userId, badgeId });
  }

  private async findBadge(id: string): Promise<Badge> {
    const badge = await this.badges.findOneBy({ id });
    if (!badge) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such badge');
    }
    return badge;
  }

  /** Ranks of the pinned badges, from 1 without gaps. */
  private async pinPositions(userId: string): Promise<Map<string, number>> {
    const pins = await this.pins.find({
      where: { userId },
      order: { position: 'ASC', pinnedAt: 'ASC' },
    });
    return new Map(pins.map((pin, index) => [pin.badgeId, index + 1]));
  }

  private async timelines(
    userId: string,
  ): Promise<Record<DistanceFamily, FamilyTimeline>> {
    return familyTimelines(await this.activities.distanceTimeline(userId));
  }

  private view(
    badge: Badge,
    timeline: FamilyTimeline,
    pinPosition: number | null,
  ): BadgeView {
    const { id, family, distanceM, name, description, icon } = badge;
    return {
      id,
      family,
      distanceM,
      name,
      description,
      icon,
      ...badgeProgress(badge, timeline),
      pinPosition,
    };
  }
}
