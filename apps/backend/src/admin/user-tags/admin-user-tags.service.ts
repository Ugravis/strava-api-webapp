import type { AdminUserTag } from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { UserTag } from '../../users/user-tag.entity';
import { UserTagAssignment } from '../../users/user-tag-assignment.entity';
import { reorderedPositions } from '../badges/reorder';
import type { CreateUserTagDto, UpdateUserTagDto } from './admin-user-tags.dto';

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
    const [userTags, counts] = await Promise.all([
      this.userTags.find({ order: { position: 'ASC', id: 'ASC' } }),
      this.holders
        .createQueryBuilder('held')
        .select('held.kind', 'kind')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy('held.kind')
        .getRawMany<{ kind: string; count: number }>(),
    ]);
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

  /** Gives the listed user tags the positions they held between them, in order. */
  async reorder(ids: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const rows = await manager
        .getRepository(UserTag)
        .createQueryBuilder('row')
        .select(['row.id', 'row.position'])
        .where('row.id IN (:...ids)', { ids })
        .setLock('pessimistic_write')
        .getMany();
      const positions = reorderedPositions(
        new Map(rows.map((row) => [row.id, row.position])),
        ids,
      );
      for (const [id, position] of positions) {
        await manager.update(UserTag, id, { position });
      }
    });
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
