import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from '../users/user.entity';
import type { StoredMetrics } from './tile-metrics';

/**
 * Version of the tiles of a user and their metrics. The trigger keeping
 * `user_tiles` up to date increments `version`; the metrics worker computes
 * the metrics of the versions it has not seen yet, outside of the requests.
 */
@Entity('user_tile_metrics')
export class UserTileMetrics {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /** Incremented whenever the tiles of the user change. */
  @Column({ type: 'bigint', default: 1 })
  version!: string;

  @Column({ name: 'changed_at', type: 'timestamptz', default: () => 'now()' })
  changedAt!: Date;

  /** Null until first computed. */
  @Column({ type: 'jsonb', nullable: true })
  metrics!: StoredMetrics | null;

  /** Version of the tiles the metrics were computed from. */
  @Column({ name: 'metrics_version', type: 'bigint', nullable: true })
  metricsVersion!: string | null;

  @Column({ name: 'computed_at', type: 'timestamptz', nullable: true })
  computedAt!: Date | null;
}
