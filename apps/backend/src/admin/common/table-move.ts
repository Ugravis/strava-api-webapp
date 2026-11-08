import { IsOptional, IsString, MaxLength } from 'class-validator';
import type { EntityManager, EntityTarget } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';

/**
 * A row of a data table moved by drag and drop, between its new neighbours
 * on the page: placed right before `before`, else right after `after`.
 */
export class TableMoveDto {
  @IsString()
  @MaxLength(64)
  id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  after!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  before!: string | null;
}

/**
 * The ids in their new order once `move` is applied, or null when the row or
 * both of its neighbours are unknown.
 */
export function movedOrder(
  order: readonly string[],
  move: Pick<TableMoveDto, 'id' | 'after' | 'before'>,
): string[] | null {
  if (!order.includes(move.id)) {
    return null;
  }
  const others = order.filter((id) => id !== move.id);
  const before = move.before ? others.indexOf(move.before) : -1;
  const after = move.after ? others.indexOf(move.after) : -1;
  const at = before >= 0 ? before : after >= 0 ? after + 1 : -1;
  if (at < 0) {
    return null;
  }
  others.splice(at, 0, move.id);
  return others;
}

/**
 * Applies `move` to the rows of `entity`, kept in order by an integer
 * `position` from 1, then numbers them all again, in one transaction.
 */
export async function moveRow(
  manager: EntityManager,
  entity: EntityTarget<{ id: string; position: number }>,
  move: TableMoveDto,
): Promise<void> {
  await manager.transaction(async (tx) => {
    const repository = tx.getRepository(entity);
    const rows: { id: string; position: number }[] = await repository
      .createQueryBuilder('row')
      .select(['row.id', 'row.position'])
      .orderBy('row.position', 'ASC')
      .addOrderBy('row.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
    const order = movedOrder(
      rows.map((row) => row.id),
      move,
    );
    if (!order) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such row');
    }
    const held = new Map(rows.map((row) => [row.id, row.position]));
    const changed = order
      .map((id, index) => [id, index + 1] as const)
      .filter(([id, position]) => held.get(id) !== position);
    if (changed.length === 0) {
      return;
    }
    await tx.query(
      `UPDATE ${repository.metadata.tableName} t
       SET position = o.position
       FROM unnest($1::varchar[], $2::int[]) AS o(id, position)
       WHERE t.id = o.id`,
      [changed.map(([id]) => id), changed.map(([, position]) => position)],
    );
  });
}
