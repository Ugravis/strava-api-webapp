import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Activity } from '../activities/activity.entity';
import { User } from '../users/user.entity';

/**
 * Tiles crossed by one activity: one row per large tile (zoom 14), whose
 * small tiles (zoom 17) are 64-bit masks. Keeping one row per activity lets
 * the tiles follow the deletion of an activity and the refinement of its
 * track. Masks are signed in PostgreSQL: see `toSignedMask`.
 */
@Entity('activity_tiles')
@Index(['userId', 'x', 'y'])
export class ActivityTile {
  @PrimaryColumn({ name: 'activity_id', type: 'uuid' })
  activityId!: string;

  @PrimaryColumn({ type: 'integer' })
  x!: number;

  @PrimaryColumn({ type: 'integer' })
  y!: number;

  @ManyToOne(() => Activity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity?: Activity;

  /** Denormalized from the activity, for the per-user queries. */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /** Small tiles crossed. */
  @Column({ type: 'bigint', default: 0 })
  mask!: string;

  /** Small tiles crossed outside the areas hidden by the athlete's privacy settings. */
  @Column({ name: 'shared_mask', type: 'bigint', default: 0 })
  sharedMask!: string;

  /** Areas hidden by the privacy settings, possibly crossed by the full track. */
  @Column({ name: 'hidden_mask', type: 'bigint', default: 0 })
  hiddenMask!: string;
}
