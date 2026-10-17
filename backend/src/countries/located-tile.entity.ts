import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * Large tiles whose countries are known (possibly none, at sea), so that
 * they are located only once.
 */
@Entity('located_tiles')
export class LocatedTile {
  @PrimaryColumn({ type: 'integer' })
  x!: number;

  @PrimaryColumn({ type: 'integer' })
  y!: number;

  @CreateDateColumn({ name: 'located_at', type: 'timestamptz' })
  locatedAt!: Date;
}
