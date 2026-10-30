import type { AdminUserTag } from '@kilotrace/shared/admin';
import {
  mapTablePage,
  type TablePage,
  type TableQuery,
} from '@kilotrace/shared/table';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { UserTag } from '../../users/user-tag.entity';
import { UserTagAssignment } from '../../users/user-tag-assignment.entity';
import { moveRow, type TableMoveDto } from '../common/table-move';
import { runTableQuery, type TableSpec } from '../common/table-query';
import type { CreateUserTagDto, UpdateUserTagDto } from './admin-user-tags.dto';

const USER_TAGS_TABLE: TableSpec = {
  search: ['tag.name', 'tag.id', 'tag.description'],
  sorts: {
    position: 'tag.position',
    name: 'tag.name',
    id: 'tag.id',
    holders:
      '(SELECT COUNT(*) FROM user_tag_assignments a WHERE a.kind = tag.id)',
    createdAt: 'tag.created_at',
  },
  defaultSort: { id: 'position', desc: false },
  tiebreak: 'tag.id',
  facets: {
    kind: { options: { system: 'tag.system', custom: 'NOT tag.system' } },
  },
  groupings: {
    kind: `CASE WHEN tag.system THEN 'system' ELSE 'custom' END`,
  },
};

/** The catalog of the user tags, read by every profile at once. */
@Injectable()
export class AdminUserTagsService {
  constructor(
    @InjectRepository(UserTag)
    private readonly userTags: Repository<UserTag>,
    @InjectRepository(UserTagAssignment)
    private readonly holders: Repository<UserTagAssignment>,
    private readonly dataSource: DataSource,
  ) {}

  async catalog(): Promise<AdminUserTag[]> {
    return this.withHolders(
      await this.userTags.find({ order: { position: 'ASC', id: 'ASC' } }),
    );
  }

  async table(query: TableQuery): Promise<TablePage<AdminUserTag>> {
    const page = await runTableQuery(
      this.userTags.createQueryBuilder('tag'),
      query,
      USER_TAGS_TABLE,
    );
    return mapTablePage(page, (userTags) => this.withHolders(userTags));
  }

  move(move: TableMoveDto): Promise<void> {
    return moveRow(this.dataSource.manager, UserTag, move);
  }

  private async withHolders(userTags: UserTag[]): Promise<AdminUserTag[]> {
    if (userTags.length === 0) {
      return [];
    }
    const counts = await this.holders
      .createQueryBuilder('held')
      .select('held.kind', 'kind')
      .where('held.kind IN (:...ids)', { ids: userTags.map(({ id }) => id) })
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('held.kind')
      .getRawMany<{ kind: string; count: number }>();
    const countOf = new Map(counts.map(({ kind, count }) => [kind, count]));
    return userTags.map((userTag) => ({
      id: userTag.id,
      name: userTag.name,
      description: userTag.description,
      icon: userTag.icon,
      color: userTag.color,
      position: userTag.position,
      system: userTag.system,
      holdersCount: countOf.get(userTag.id) ?? 0,
      createdAt: userTag.createdAt.toISOString(),
    }));
  }

  /** A new user tag, last of the catalog, held by nobody yet. */
  async create(dto: CreateUserTagDto): Promise<void> {
    if (await this.userTags.existsBy({ id: dto.id })) {
      throw ApiErrors.conflict(ApiErrorCode.IdTaken, 'UserTag id taken');
    }
    const last = await this.userTags
      .createQueryBuilder('row')
      .select('COALESCE(MAX(row.position), 0) + 1', 'next')
      .getRawOne<{ next: number }>();
    await this.userTags.insert({
      id: dto.id,
      ...fieldsOf(dto),
      position: Number(last?.next ?? 1),
      system: false,
    });
  }

  async update(id: string, dto: UpdateUserTagDto): Promise<void> {
    await this.find(id);
    await this.userTags.update(id, fieldsOf(dto));
  }

  /** Withdrawn from every profile; the ones awarded by the code stay. */
  async delete(id: string): Promise<void> {
    const userTag = await this.find(id);
    if (userTag.system) {
      throw ApiErrors.conflict(
        ApiErrorCode.SystemUserTag,
        'UserTag awarded by the application',
      );
    }
    await this.userTags.delete(id);
  }

  private async find(id: string): Promise<UserTag> {
    const userTag = await this.userTags.findOneBy({ id });
    if (!userTag) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such userTag');
    }
    return userTag;
  }
}

function fieldsOf(dto: UpdateUserTagDto) {
  return {
    name: dto.name,
    description: dto.description,
    icon: dto.icon,
    color: dto.color?.toLowerCase() ?? null,
  };
}
