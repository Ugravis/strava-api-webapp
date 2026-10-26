import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Activity } from './activity.entity';

/** Data providers activities can be imported from. */
export type ActivityProvider = 'strava';

/**
 * Links an activity to its record at a provider. The unique provider
 * identifier makes imports idempotent; an activity may later have several
 * sources (the same ride synced from two services).
 */
@Entity('activity_sources')
@Index(['provider', 'externalId'], { unique: true })
export class ActivitySource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'activity_id', type: 'uuid' })
  @Index()
  activityId!: string;

  @ManyToOne(() => Activity, (activity) => activity.sources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_id' })
  activity?: Activity;

  @Column({ type: 'varchar', length: 20 })
  provider!: ActivityProvider;

  @Column({ name: 'external_id', type: 'varchar', length: 64 })
  externalId!: string;

  /** Last time the activity was read from the provider. */
  @Column({ name: 'fetched_at', type: 'timestamptz' })
  fetchedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
