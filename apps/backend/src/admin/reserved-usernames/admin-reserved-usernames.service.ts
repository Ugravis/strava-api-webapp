import type { AdminReservedUsername } from '@kilotrace/shared/admin';
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

  async reserve(actor: User, dto: ReserveUsernameDto): Promise<void> {
    if (await this.users.existsBy({ username: dto.username })) {
      throw ApiErrors.conflict(
        ApiErrorCode.UsernameTaken,
        'An account holds this username',
      );
    }
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
    const { affected } = await this.reserved.update(
      { username },
      { category: dto.category, note: dto.note ?? null },
    );
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
