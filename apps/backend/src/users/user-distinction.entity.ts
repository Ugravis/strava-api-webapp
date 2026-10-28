import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Distinction } from './distinction.entity';
import { User } from './user.entity';

/**
 * Distinctions held by the users: never derived from Strava data, so shown
 * on every profile, private ones included. `team` follows the back-office
 * roles, `early_member` goes to the first `EARLY_MEMBERS` accounts, the
 * others are granted by hand.
 */
export const EARLY_MEMBERS = 100;

@Entity('user_distinctions')
export class UserDistinction {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 32 })
  kind!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Distinction, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'kind',
    foreignKeyConstraintName: 'FK_user_distinctions_distinction',
  })
  distinction?: Distinction;

  @CreateDateColumn({ name: 'awarded_at', type: 'timestamptz' })
  awardedAt!: Date;
}
