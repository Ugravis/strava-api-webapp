import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { Activity } from '../activities/activity.entity';

/**
 * What an activity brought to the tiles of its user when it was recorded,
 * replayed in the order of the activities by the gains worker. Gained tiles
 * are flattened `[x0, y0, x1, y1, …]` pairs.
 */
@Entity('activity_gains')
@Index(['userId'])
export class ActivityGain {
  @PrimaryColumn({ name: 'activity_id', type: 'uuid' })
  activityId!: string;

  @OneToOne(() => Activity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity?: Activity;

  /** Denormalized from the activity, for the per-user queries. */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** Large tiles (zoom 14) no earlier activity had crossed. */
  @Column({ name: 'gained_tiles', type: 'integer', array: true })
  gainedTiles!: number[];

  /** Small tiles (zoom 17) no earlier activity had crossed. */
  @Column({ name: 'gained_subtiles', type: 'integer', array: true })
  gainedSubtiles!: number[];

  /** Growth of the largest cluster of large tiles. */
  @Column({ name: 'max_cluster_tiles', type: 'integer' })
  maxClusterTiles!: number;

  /** Large tiles that became cluster tiles outside of the largest cluster. */
  @Column({ name: 'other_cluster_tiles', type: 'integer' })
  otherClusterTiles!: number;

  @Column({ name: 'max_cluster_subtiles', type: 'integer' })
  maxClusterSubtiles!: number;

  @Column({ name: 'other_cluster_subtiles', type: 'integer' })
  otherClusterSubtiles!: number;
}
