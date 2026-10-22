import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Badges owed to the membership, not to sport: never derived from Strava
 * data, so shown on every profile, private ones included.
 * `founder` and `team` are granted by hand; `early_member` to the first
 * `EARLY_MEMBERS` accounts.
 */
export const DISTINCTION_KINDS = ['founder', 'team', 'early_member'] as const;

export type DistinctionKind = (typeof DISTINCTION_KINDS)[number];

export const EARLY_MEMBERS = 100;

@Entity('user_distinctions')
export class UserDistinction {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 32 })
  kind!: DistinctionKind;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @CreateDateColumn({ name: 'awarded_at', type: 'timestamptz' })
  awardedAt!: Date;
}
