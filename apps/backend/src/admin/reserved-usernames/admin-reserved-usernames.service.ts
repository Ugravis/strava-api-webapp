import {
  type AdminReservedUsername,
  RESERVED_USERNAME_CATEGORIES,
  type ReservedUsernameCategory,
  type ReservedUsernamesOverview,
} from '@kilotrace/shared/admin';
import {
  mapTablePage,
  type TablePage,
  type TableQuery,
} from '@kilotrace/shared/table';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { isUniqueViolation } from '../../common/database-errors';
import { ReservedUsername } from '../../users/reserved-username.entity';
import { User } from '../../users/user.entity';
import { toAuditUser } from '../common/audit-user';
import { runTableQuery, type TableSpec } from '../common/table-query';
import type {
  ReserveUsernameDto,
  UpdateReservedUsernameDto,
} from './admin-reserved-usernames.dto';
import { LAST_DAYS } from '../daily-series';

const DAY_MS = 86_400_000;

/** The author, '' for the initial list, '~' for a deleted account. */
const AUTHOR = `CASE WHEN reserved.created_by_id IS NULL THEN NULL ELSE COALESCE(author.username, '~') END`;

const RESERVED_TABLE: TableSpec = {
  search: ['reserved.username', 'reserved.note'],
  sorts: {
    username: 'reserved.username',
    category: 'reserved.category',
    createdBy: 'author.username',
    createdAt: 'reserved.created_at',
    note: 'reserved.note',
  },
  tiebreak: 'reserved.username',
  facets: { category: { column: 'reserved.category' } },
  groupings: { category: 'reserved.category', createdBy: AUTHOR },
};

/**
 * Usernames nobody can take. A username already held by an account is
 * refused: the account is renamed through the moderation first.
 */
@Injectable()
export class AdminReservedUsernamesService {
  constructor(
    @InjectRepository(ReservedUsername)
    private readonly reserved: Repository<ReservedUsername>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async table(query: TableQuery): Promise<TablePage<AdminReservedUsername>> {
    const base = this.reserved
      .createQueryBuilder('reserved')
      .leftJoin(User, 'author', 'author.id = reserved.created_by_id');
    const page = await runTableQuery(base, query, RESERVED_TABLE);
    return mapTablePage(page, (entries) => this.entries(entries));
  }

  async overview(): Promise<ReservedUsernamesOverview> {
    const rows = await this.reserved
      .createQueryBuilder('reserved')
      .select('reserved.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        'COUNT(*) FILTER (WHERE reserved.created_at >= :month)',
        'recent',
      )
      .setParameter('month', new Date(Date.now() - 30 * DAY_MS))
      .groupBy('reserved.category')
      .getRawMany<{
        category: ReservedUsernameCategory;
        count: string;
        recent: string;
      }>();
    const byCategory = Object.fromEntries(
      RESERVED_USERNAME_CATEGORIES.map((category) => [category, 0]),
    ) as Record<ReservedUsernameCategory, number>;
    let recent = 0;
    for (const row of rows) {
      byCategory[row.category] = Number(row.count);
      recent += Number(row.recent);
    }
    const days = await this.reserved.query<{ count: number }[]>(
      `SELECT COUNT(reserved.created_at)::int AS count
         FROM ${LAST_DAYS}
         LEFT JOIN reserved_usernames reserved
           ON reserved.created_at >= day AND reserved.created_at < day + interval '1 day'
        GROUP BY day ORDER BY day`,
    );
    return {
      total: Object.values(byCategory).reduce((sum, count) => sum + count, 0),
      recent,
      byCategory,
      addedByDay: days.map((day) => day.count),
    };
  }

  private async entries(
    entries: ReservedUsername[],
  ): Promise<AdminReservedUsername[]> {
    const authorIds = [
      ...new Set(entries.flatMap(({ createdById }) => createdById ?? [])),
    ];
    const authors = authorIds.length
      ? await this.users.findBy({ id: In(authorIds) })
      : [];
    const authorById = new Map(authors.map((user) => [user.id, user]));
    return entries.map((entry) => ({
      username: entry.username,
      category: entry.category,
      note: entry.note,
      createdBy: entry.createdById
        ? toAuditUser(entry.createdById, authorById.get(entry.createdById))
        : null,
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  /** Refuses a username held by an account: reserving it would not free it. */
  private async assertUnheld(username: string): Promise<void> {
    if (await this.users.existsBy({ username })) {
      throw ApiErrors.conflict(
        ApiErrorCode.UsernameTaken,
        'An account holds this username',
      );
    }
  }

  async reserve(actor: User, dto: ReserveUsernameDto): Promise<void> {
    await this.assertUnheld(dto.username);
    try {
      await this.reserved.insert({
        username: dto.username,
        category: dto.category,
        note: dto.note ?? null,
        createdById: actor.id,
      });
    } catch (error) {
      if (isUniqueViolation(error, 'username')) {
        throw ApiErrors.conflict(
          ApiErrorCode.UsernameReserved,
          'This username is already reserved',
        );
      }
      throw error;
    }
  }

  async update(
    username: string,
    dto: UpdateReservedUsernameDto,
  ): Promise<void> {
    const renamed = dto.username !== undefined && dto.username !== username;
    if (renamed) await this.assertUnheld(dto.username!);
    let affected: number | null | undefined;
    try {
      ({ affected } = await this.reserved.update(
        { username },
        {
          ...(renamed && { username: dto.username }),
          category: dto.category,
          note: dto.note ?? null,
        },
      ));
    } catch (error) {
      if (renamed && isUniqueViolation(error, 'username')) {
        throw ApiErrors.conflict(
          ApiErrorCode.UsernameReserved,
          'This username is already reserved',
        );
      }
      throw error;
    }
    if (!affected) {
      throw ApiErrors.notFound(
        ApiErrorCode.NotFound,
        'This username is not reserved',
      );
    }
  }

  async release(username: string): Promise<void> {
    const { affected } = await this.reserved.delete({ username });
    if (!affected) {
      throw ApiErrors.notFound(
        ApiErrorCode.NotFound,
        'This username is not reserved',
      );
    }
  }
}
