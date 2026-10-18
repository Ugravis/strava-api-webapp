import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { UserBadgePin } from './user-badge-pin.entity';

export type BadgeView = Omit<Badge, 'createdAt' | 'position'> &
  BadgeProgress & {
    /** When the user pinned the badge; null when not pinned. */
    pinnedAt: Date | null;
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
  ) {}

  async overview(userId: string): Promise<DistancesOverview> {
    const [badges, pins, timelines] = await Promise.all([
      this.badges.find({ order: { position: 'ASC', id: 'ASC' } }),
      this.pinDates(userId),
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
      this.pinDates(userId),
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

  /** Pins a badge; pinning it again keeps its first pin date. */
  async pin(userId: string, badgeId: string): Promise<void> {
    await this.findBadge(badgeId);
    await this.pins
      .createQueryBuilder()
      .insert()
      .values({ userId, badgeId })
      .orIgnore()
      .execute();
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

  private async pinDates(userId: string): Promise<Map<string, Date>> {
    const pins = await this.pins.findBy({ userId });
    return new Map(pins.map((pin) => [pin.badgeId, pin.pinnedAt]));
  }

  private async timelines(
    userId: string,
  ): Promise<Record<DistanceFamily, FamilyTimeline>> {
    return familyTimelines(await this.activities.distanceTimeline(userId));
  }

  private view(
    badge: Badge,
    timeline: FamilyTimeline,
    pinnedAt: Date | null,
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
      pinnedAt,
    };
  }
}
