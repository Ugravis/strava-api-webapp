import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Highest Strava quota usage observed in each quarter of an hour, the window
 * of the short quota. The daily usage of a UTC day is the highest of its
 * quarters. Null where Strava sent no header for that quota.
 */
@Entity('strava_api_usage')
export class StravaApiUsage {
  @PrimaryColumn({
    name: 'window_start',
    type: 'timestamptz',
    primaryKeyConstraintName: 'PK_strava_api_usage',
  })
  windowStart!: Date;

  @Column({ name: 'short_usage', type: 'integer', nullable: true })
  shortUsage!: number | null;

  @Column({ name: 'short_limit', type: 'integer', nullable: true })
  shortLimit!: number | null;

  @Column({ name: 'daily_usage', type: 'integer', nullable: true })
  dailyUsage!: number | null;

  @Column({ name: 'daily_limit', type: 'integer', nullable: true })
  dailyLimit!: number | null;

  @Column({ name: 'read_short_usage', type: 'integer', nullable: true })
  readShortUsage!: number | null;

  @Column({ name: 'read_short_limit', type: 'integer', nullable: true })
  readShortLimit!: number | null;

  @Column({ name: 'read_daily_usage', type: 'integer', nullable: true })
  readDailyUsage!: number | null;

  @Column({ name: 'read_daily_limit', type: 'integer', nullable: true })
  readDailyLimit!: number | null;
}
