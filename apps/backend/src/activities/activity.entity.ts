import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { ActivitySource } from './activity-source.entity';
import type { SportType } from './sport-type';

/**
 * An activity in the platform's own canonical schema. It is not a mirror of
 * any provider: provider identifiers live in `activity_sources`.
 * No location data is stored here.
 */
@Entity('activities')
@Index(['userId', 'startedAt'])
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'sport_type', type: 'varchar', length: 40 })
  sportType!: SportType;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  /** IANA time zone of the start, e.g. `Europe/Paris`. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  timezone!: string | null;

  @Column({ name: 'distance_m', type: 'double precision' })
  distanceM!: number;

  @Column({ name: 'moving_time_s', type: 'integer' })
  movingTimeS!: number;

  @Column({ name: 'elapsed_time_s', type: 'integer' })
  elapsedTimeS!: number;

  @Column({
    name: 'elevation_gain_m',
    type: 'double precision',
    nullable: true,
  })
  elevationGainM!: number | null;

  /** Recorded on a home trainer or a treadmill: no track to expect. */
  @Column({ type: 'boolean', default: false })
  indoor!: boolean;

  /** Entered by hand, without a recording device: no track to expect. */
  @Column({ type: 'boolean', default: false })
  manual!: boolean;

  @OneToMany(() => ActivitySource, (source) => source.activity)
  sources?: ActivitySource[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
