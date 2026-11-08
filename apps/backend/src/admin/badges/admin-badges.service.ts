import type {
  AdminBadge,
  AdminBadgeCatalog,
  AdminBadgeThemeRow,
} from '@kilotrace/shared/admin';
import {
  mapTablePage,
  type TablePage,
  type TableQuery,
} from '@kilotrace/shared/table';
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
import { moveRow, type TableMoveDto } from '../common/table-move';
import { runTableQuery, type TableSpec } from '../common/table-query';

type Positioned = typeof Badge | typeof BadgeTheme;

const FAVORITES =
  '(SELECT COUNT(*) FROM user_favorite_badges f WHERE f.badge_id = badge.id)';
const PROFILES =
  '(SELECT COUNT(*) FROM user_profile_badges p WHERE p.badge_id = badge.id)';

/**
 * Key of the collection of a badge, in the order of the collections:
 * `0003-astronomy`, `none` for none, last (digits sort first).
 */
const BADGE_THEME_KEY = `CASE WHEN theme.id IS NULL THEN 'none' ELSE lpad(theme.position::text, 4, '0') || '-' || theme.id END`;

const BADGES_TABLE: TableSpec = {
  search: ['badge.name', 'badge.id', 'badge.description'],
  sorts: {
    position: 'badge.position',
    name: 'badge.name',
    id: 'badge.id',
    theme: 'theme.position',
    metric: 'badge.metric',
    family: 'badge.family',
    favorites: FAVORITES,
    profiles: PROFILES,
    createdAt: 'badge.created_at',
  },
  defaultSort: { id: 'position', desc: false },
  tiebreak: 'badge.id',
  facets: {
    status: {
      options: { active: 'badge.active', inactive: 'NOT badge.active' },
    },
    theme: { column: `COALESCE(badge.theme_id, '~')` },
    metric: { column: 'badge.metric' },
    family: { column: 'badge.family' },
  },
  groupings: {
    theme: BADGE_THEME_KEY,
    metric: 'badge.metric',
    family: 'badge.family',
    status: `CASE WHEN badge.active THEN 'active' ELSE 'inactive' END`,
  },
};

const THEMES_TABLE: TableSpec = {
  search: ['theme.name', 'theme.id'],
  sorts: {
    position: 'theme.position',
    name: 'theme.name',
    id: 'theme.id',
    badges: '(SELECT COUNT(*) FROM badges b WHERE b.theme_id = theme.id)',
  },
  defaultSort: { id: 'position', desc: false },
  tiebreak: 'theme.id',
};

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

  async table(query: TableQuery): Promise<TablePage<AdminBadge>> {
    const base = this.badges
      .createQueryBuilder('badge')
      .leftJoin(BadgeTheme, 'theme', 'theme.id = badge.theme_id');
    const page = await runTableQuery(base, query, BADGES_TABLE);
    return mapTablePage(page, (badges) => this.withCounts(badges));
  }

  async themesTable(query: TableQuery): Promise<TablePage<AdminBadgeThemeRow>> {
    const page = await runTableQuery(
      this.themes.createQueryBuilder('theme'),
      query,
      THEMES_TABLE,
    );
    return mapTablePage(page, async (themes) => {
      const counts = await this.counts(
        'SELECT theme_id AS id, COUNT(*)::int AS count FROM badges WHERE theme_id = ANY($1) GROUP BY theme_id',
        themes.map((theme) => theme.id),
      );
      return themes.map(({ id, name, position }) => ({
        id,
        name,
        position,
        badgesCount: counts.get(id) ?? 0,
      }));
    });
  }

  moveBadge(move: TableMoveDto): Promise<void> {
    return moveRow(this.dataSource.manager, Badge, move);
  }

  moveTheme(move: TableMoveDto): Promise<void> {
    return moveRow(this.dataSource.manager, BadgeTheme, move);
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

  private async withCounts(badges: Badge[]): Promise<AdminBadge[]> {
    const ids = badges.map((badge) => badge.id);
    const [favorites, profiles] = await Promise.all([
      this.counts(
        'SELECT badge_id AS id, COUNT(*)::int AS count FROM user_favorite_badges WHERE badge_id = ANY($1) GROUP BY badge_id',
        ids,
      ),
      this.counts(
        'SELECT badge_id AS id, COUNT(*)::int AS count FROM user_profile_badges WHERE badge_id = ANY($1) GROUP BY badge_id',
        ids,
      ),
    ]);
    return badges.map((badge) =>
      toAdminBadge(
        badge,
        favorites.get(badge.id) ?? 0,
        profiles.get(badge.id) ?? 0,
      ),
    );
  }

  /** Counts by id, from a query selecting `id` and `count` of the ids `$1`. */
  private async counts(
    sql: string,
    ids: string[],
  ): Promise<Map<string, number>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows: { id: string; count: number }[] = await this.dataSource.query(
      sql,
      [ids],
    );
    return new Map(rows.map((row) => [row.id, row.count]));
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
