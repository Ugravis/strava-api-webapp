import { Entity, Index, PrimaryColumn } from 'typeorm';

/** A signed-in user seen on a UTC day: one row per user and per day. */
@Entity('user_activity')
@Index(['day'])
export class UserActivity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** UTC day, `YYYY-MM-DD`. */
  @PrimaryColumn({ type: 'date' })
  day!: string;
}
