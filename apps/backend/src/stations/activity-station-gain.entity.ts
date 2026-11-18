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
 * What an activity brought to the stations of its user, replayed from the
 * first visits by the station metrics worker: only the activities that
 * reached a new station have a row.
 */
@Entity('activity_station_gains')
@Index('IDX_activity_station_gains_user', ['userId', 'startedAt'])
export class ActivityStationGain {
  @PrimaryColumn({ name: 'activity_id', type: 'uuid' })
  activityId!: string;

  @OneToOne(() => Activity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity?: Activity;

  /** Denormalized from the activity, for the per-user queries. */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** Denormalized from the activity: the history sums the gains up to a date. */
  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  /** Stations no earlier activity had reached. */
  @Column({ type: 'integer' })
  stations!: number;

  /** Growth of the largest network of visited stations. */
  @Column({ name: 'max_cluster', type: 'integer' })
  maxCluster!: number;
}
