import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type { DistanceFamily } from './distance-families';

/**
 * A known distance the cumulated distance of a family of sports is compared
 * to. The catalog is shared by every user and maintained through migrations.
 */
@Entity('badges')
export class Badge {
  /** Stable slug, e.g. `marathon`. */
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 16 })
  family!: DistanceFamily;

  @Column({ name: 'distance_m', type: 'double precision' })
  distanceM!: number;

  /** Display name, in French. */
  @Column({ type: 'varchar', length: 80 })
  name!: string;

  /** Display description, in French. */
  @Column({ type: 'varchar', length: 300 })
  description!: string;

  /** Icon key, resolved by the clients; unknown keys get a generic icon. */
  @Column({ type: 'varchar', length: 40 })
  icon!: string;

  /** Display order, ascending. */
  @Column({ type: 'integer' })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
