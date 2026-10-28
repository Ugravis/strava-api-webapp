import type { AdminBadge, AdminBadgeCatalog } from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { Badge } from '../../distances/badge.entity';
import { BadgeTheme } from '../../distances/badge-theme.entity';
import type {
  CreateBadgeDto,
  CreateBadgeThemeDto,
  UpdateBadgeDto,
  UpdateBadgeThemeDto,
} from './admin-badges.dto';
import { reorderedPositions } from './reorder';

type Positioned = typeof Badge | typeof BadgeTheme;

/**
 * The catalog of badges and their collections. Completions are computed
 * from the activities on every read: a change applies to every user at once.
 */
@Injectable()
export class AdminBadgesService {
  constructor(
    @InjectRepository(Badge) private readonly badges: Repository<Badge>,
    @InjectRepository(BadgeTheme)
    private readonly themes: Repository<BadgeTheme>,
    private readonly dataSource: DataSource,
  ) {}

  async catalog(): Promise<AdminBadgeCatalog> {
    const [themes, badges] = await Promise.all([
      this.themes.find({ order: { position: 'ASC', id: 'ASC' } }),
      this.badges
        .createQueryBuilder('badge')
        .addSelect(
          '(SELECT COUNT(*) FROM user_favorite_badges f WHERE f.badge_id = badge.id)::int',
          'favorites_count',
        )
        .addSelect(
          '(SELECT COUNT(*) FROM user_profile_badges p WHERE p.badge_id = badge.id)::int',
          'profiles_count',
        )
        .orderBy('badge.position', 'ASC')
        .addOrderBy('badge.id', 'ASC')
        .getRawAndEntities<{
          favorites_count: number;
          profiles_count: number;
        }>(),
    ]);
    return {
      themes: themes.map(({ id, name, position }) => ({ id, name, position })),
      badges: badges.entities.map((badge, index) =>
        toAdminBadge(
          badge,
          badges.raw[index].favorites_count,
          badges.raw[index].profiles_count,
        ),
      ),
    };
  }

  /** A new badge, active, last of the catalog. */
  async createBadge(dto: CreateBadgeDto): Promise<void> {
    await this.checkTheme(dto.themeId);
    if (await this.badges.existsBy({ id: dto.id })) {
      throw ApiErrors.conflict(ApiErrorCode.IdTaken, 'Badge id taken');
    }
    await this.badges.insert({
      id: dto.id,
      ...fieldsOf(dto),
      backgroundImage: null,
      position: await this.nextPosition(Badge),
      active: true,
    });
  }

  async updateBadge(id: string, dto: UpdateBadgeDto): Promise<void> {
    await this.checkTheme(dto.themeId);
    await this.findBadge(id);
    await this.badges.update(id, {
      ...fieldsOf(dto),
      // Color and image are exclusive; the color picked wins.
      ...(dto.backgroundColor && { backgroundImage: null }),
    });
  }

  async setBadgeActive(id: string, active: boolean): Promise<void> {
    await this.findBadge(id);
    await this.badges.update(id, { active });
  }

  /** Favorites and profile picks of the badge go with it. */
  async deleteBadge(id: string): Promise<void> {
    await this.findBadge(id);
    await this.badges.delete(id);
  }

  reorderBadges(ids: string[]): Promise<void> {
    return this.reorder(Badge, ids);
  }

  /** A new collection, last. */
  async createTheme(dto: CreateBadgeThemeDto): Promise<void> {
    if (await this.themes.existsBy({ id: dto.id })) {
      throw ApiErrors.conflict(ApiErrorCode.IdTaken, 'Collection id taken');
    }
    await this.themes.insert({
      id: dto.id,
      name: dto.name,
      position: await this.nextPosition(BadgeTheme),
    });
  }

  async updateTheme(id: string, dto: UpdateBadgeThemeDto): Promise<void> {
    await this.findTheme(id);
    await this.themes.update(id, { name: dto.name });
  }

  /** Its badges stay, out of any collection. */
  async deleteTheme(id: string): Promise<void> {
    await this.findTheme(id);
    await this.themes.delete(id);
  }

  reorderThemes(ids: string[]): Promise<void> {
    return this.reorder(BadgeTheme, ids);
  }

  /** Gives the listed rows the positions they held between them, in order. */
  private async reorder(entity: Positioned, ids: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const rows: { id: string; position: number }[] = await manager
        .getRepository(entity)
        .createQueryBuilder('row')
        .select(['row.id', 'row.position'])
        .where('row.id IN (:...ids)', { ids })
        .setLock('pessimistic_write')
        .getMany();
      const positions = reorderedPositions(
        new Map(rows.map((row) => [row.id, row.position])),
        ids,
      );
      if (positions.length === 0) {
        return;
      }
      await manager.query(
        `UPDATE ${manager.getRepository(entity).metadata.tableName} t
         SET position = o.position
         FROM unnest($1::varchar[], $2::int[]) AS o(id, position)
         WHERE t.id = o.id`,
        [
          positions.map(([id]) => id),
          positions.map(([, position]) => position),
        ],
      );
    });
  }

  private async nextPosition(entity: Positioned): Promise<number> {
    const row = await this.dataSource
      .getRepository(entity)
      .createQueryBuilder('row')
      .select('COALESCE(MAX(row.position), 0) + 1', 'next')
      .getRawOne<{ next: number }>();
    return Number(row?.next ?? 1);
  }

  private async findBadge(id: string): Promise<Badge> {
    const badge = await this.badges.findOneBy({ id });
    if (!badge) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such badge');
    }
    return badge;
  }

  private async findTheme(id: string): Promise<BadgeTheme> {
    const theme = await this.themes.findOneBy({ id });
    if (!theme) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such collection');
    }
    return theme;
  }

  private async checkTheme(id: string | null): Promise<void> {
    if (id !== null && !(await this.themes.existsBy({ id }))) {
      throw ApiErrors.badRequest(ApiErrorCode.NotFound, 'No such collection');
    }
  }
}

/** Stored fields of a badge; a tiered badge targets its last tier. */
function fieldsOf(dto: UpdateBadgeDto) {
  const tiers = dto.tiers ? [...dto.tiers].sort((a, b) => a - b) : null;
  return {
    metric: dto.metric,
    family: dto.family,
    target: tiers ? tiers[tiers.length - 1] : dto.target,
    tiers,
    name: dto.name,
    description: dto.description,
    themeId: dto.themeId,
    icon: dto.icon,
    backgroundColor: dto.backgroundColor?.toUpperCase() ?? null,
  };
}

function toAdminBadge(
  badge: Badge,
  favoritesCount: number,
  profilesCount: number,
): AdminBadge {
  return {
    id: badge.id,
    metric: badge.metric,
    family: badge.family,
    target: badge.target,
    tiers: badge.tiers,
    name: badge.name,
    description: badge.description,
    themeId: badge.themeId,
    icon: badge.icon,
    backgroundColor: badge.backgroundColor,
    position: badge.position,
    active: badge.active,
    favoritesCount,
    profilesCount,
    createdAt: badge.createdAt.toISOString(),
  };
}
