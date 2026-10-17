import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../users/user.entity';

/**
 * Large tiles (zoom 14) crossed by a user, with every small tile crossed by
 * any of the activities: the union of `activity_tiles` per user, kept up to
 * date by a trigger on it. Masks are signed in PostgreSQL: see `toSignedMask`.
 */
@Entity('user_tiles')
export class UserTile {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'integer' })
  x!: number;

  @PrimaryColumn({ type: 'integer' })
  y!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /** Small tiles crossed. */
  @Column({ type: 'bigint' })
  mask!: string;

  /** Small tiles of the largest cluster of small tiles, as of the last metrics. */
  @Column({ name: 'max_cluster_mask', type: 'bigint', default: 0 })
  maxClusterMask!: string;

  /** Small tiles of every cluster of small tiles, as of the last metrics. */
  @Column({ name: 'cluster_mask', type: 'bigint', default: 0 })
  clusterMask!: string;

  /** Whether the large tile is a cluster tile, as of the last metrics. */
  @Column({ name: 'in_cluster', type: 'boolean', default: false })
  inCluster!: boolean;

  /** Whether the large tile belongs to the largest cluster of large tiles, as of the last metrics. */
  @Column({ name: 'in_max_cluster', type: 'boolean', default: false })
  inMaxCluster!: boolean;

  /**
   * Value of `user_tiles_change_seq` at the last change of the row, taken
   * under the lock of the user: the map tiles are revalidated from it.
   */
  @Column({ name: 'changed_seq', type: 'bigint', default: 0 })
  changedSeq!: string;
}
