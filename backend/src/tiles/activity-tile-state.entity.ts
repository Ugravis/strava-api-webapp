import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Activity } from '../activities/activity.entity';

/**
 * - `no_track`: nothing to compute (indoor, manual, no GPS).
 * - `pending_stream`: tiles computed from the simplified track, the full
 *   track is awaited (see `streamReason`).
 * - `done`: final tiles.
 */
export type TileStatus = 'no_track' | 'pending_stream' | 'done';
/** Track the tiles were computed from. */
export type TilePrecision = 'summary' | 'stream';
/** `sparse`: points too far apart; `cropped`: hidden start or end not covered yet. */
export type StreamReason = 'sparse' | 'cropped';

/** Tile computation state of an activity. No location data is kept here. */
@Entity('activity_tile_states')
@Index(['status', 'runAfter'])
// The countries worker looks for the tiles saved recently.
@Index(['updatedAt'])
export class ActivityTileState {
  @PrimaryColumn({ name: 'activity_id', type: 'uuid' })
  activityId!: string;

  @OneToOne(() => Activity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity?: Activity;

  @Column({ type: 'varchar', length: 20 })
  status!: TileStatus;

  @Column({ type: 'varchar', length: 10, nullable: true })
  precision!: TilePrecision | null;

  @Column({
    name: 'stream_reason',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  streamReason!: StreamReason | null;

  /** Straight distance (meters) cropped from the start of the simplified track. */
  @Column({ name: 'hidden_start_m', type: 'real', default: 0 })
  hiddenStartM!: number;

  @Column({ name: 'hidden_end_m', type: 'real', default: 0 })
  hiddenEndM!: number;

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @Column({ name: 'run_after', type: 'timestamptz', default: () => 'now()' })
  runAfter!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
