import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { ActivityGain } from './activity-gain.entity';

/**
 * Small tiles first crossed by an activity, one row per large tile (zoom
 * 14): the gained small tiles of `activity_gains`, indexed by place for the
 * history of the map. Every small tile of a user lies in exactly one row,
 * and a large tile was first visited at the earliest of its rows. Masks are
 * signed in PostgreSQL: see `toSignedMask`.
 */
@Entity('tile_first_visits')
@Index(['userId', 'x', 'y'])
export class TileFirstVisit {
  @PrimaryColumn({ name: 'activity_id', type: 'uuid' })
  activityId!: string;

  @PrimaryColumn({ type: 'integer' })
  x!: number;

  @PrimaryColumn({ type: 'integer' })
  y!: number;

  @ManyToOne(() => ActivityGain, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  gain?: ActivityGain;

  /** Denormalized from the activity, for the per-user queries. */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** Start of the activity. */
  @Column({ name: 'visited_at', type: 'timestamptz' })
  visitedAt!: Date;

  /** Small tiles first crossed by the activity. */
  @Column({ type: 'bigint' })
  mask!: string;
}
