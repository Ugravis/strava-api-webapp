import type { AdminReservedUsername } from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { isUniqueViolation } from '../../common/database-errors';
import { ReservedUsername } from '../../users/reserved-username.entity';
import { User } from '../../users/user.entity';
import { toAuditUser } from '../common/audit-user';
import type { ReserveUsernameDto } from './admin-reserved-usernames.dto';

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

  async list(): Promise<AdminReservedUsername[]> {
    const entries = await this.reserved.find({ order: { username: 'ASC' } });
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
