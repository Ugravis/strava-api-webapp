import type { AdminDistinction } from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { Distinction } from '../../users/distinction.entity';
import { UserDistinction } from '../../users/user-distinction.entity';
import { reorderedPositions } from '../badges/reorder';
import type {
  CreateDistinctionDto,
  UpdateDistinctionDto,
} from './admin-distinctions.dto';

/** The catalog of the distinctions, read by every profile at once. */
@Injectable()
export class AdminDistinctionsService {
  constructor(
    @InjectRepository(Distinction)
    private readonly distinctions: Repository<Distinction>,
    @InjectRepository(UserDistinction)
    private readonly holders: Repository<UserDistinction>,
    private readonly dataSource: DataSource,
  ) {}

  async catalog(): Promise<AdminDistinction[]> {
    const [distinctions, counts] = await Promise.all([
      this.distinctions.find({ order: { position: 'ASC', id: 'ASC' } }),
      this.holders
        .createQueryBuilder('held')
        .select('held.kind', 'kind')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy('held.kind')
        .getRawMany<{ kind: string; count: number }>(),
    ]);
    const countOf = new Map(counts.map(({ kind, count }) => [kind, count]));
    return distinctions.map((distinction) => ({
      id: distinction.id,
      name: distinction.name,
      description: distinction.description,
      icon: distinction.icon,
      color: distinction.color,
      position: distinction.position,
      system: distinction.system,
      holdersCount: countOf.get(distinction.id) ?? 0,
      createdAt: distinction.createdAt.toISOString(),
    }));
  }

  /** A new distinction, last of the catalog, held by nobody yet. */
  async create(dto: CreateDistinctionDto): Promise<void> {
    if (await this.distinctions.existsBy({ id: dto.id })) {
      throw ApiErrors.conflict(ApiErrorCode.IdTaken, 'Distinction id taken');
    }
    const last = await this.distinctions
      .createQueryBuilder('row')
      .select('COALESCE(MAX(row.position), 0) + 1', 'next')
      .getRawOne<{ next: number }>();
    await this.distinctions.insert({
      id: dto.id,
      ...fieldsOf(dto),
      position: Number(last?.next ?? 1),
      system: false,
    });
  }

  async update(id: string, dto: UpdateDistinctionDto): Promise<void> {
    await this.find(id);
    await this.distinctions.update(id, fieldsOf(dto));
  }

  /** Withdrawn from every profile; the ones awarded by the code stay. */
  async delete(id: string): Promise<void> {
    const distinction = await this.find(id);
    if (distinction.system) {
      throw ApiErrors.conflict(
        ApiErrorCode.SystemDistinction,
        'Distinction awarded by the application',
      );
    }
    await this.distinctions.delete(id);
  }

  /** Gives the listed distinctions the positions they held between them, in order. */
  async reorder(ids: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const rows = await manager
        .getRepository(Distinction)
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
        await manager.update(Distinction, id, { position });
      }
    });
  }

  private async find(id: string): Promise<Distinction> {
    const distinction = await this.distinctions.findOneBy({ id });
    if (!distinction) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such distinction');
    }
    return distinction;
  }
}

function fieldsOf(dto: UpdateDistinctionDto) {
  return {
    name: dto.name,
    description: dto.description,
    icon: dto.icon,
    color: dto.color?.toLowerCase() ?? null,
  };
}
