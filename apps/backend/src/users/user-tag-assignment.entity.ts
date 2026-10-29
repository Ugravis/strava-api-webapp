import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserTag } from './user-tag.entity';
import { User } from './user.entity';

/**
 * User tags held by the users: never derived from Strava data, so shown
 * on every profile, private ones included. `team` follows the back-office
 * roles, `early_member` goes to the first `EARLY_MEMBERS` accounts, the
 * others are granted by hand.
 */
export const EARLY_MEMBERS = 100;

@Entity('user_tag_assignments')
export class UserTagAssignment {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 32 })
  kind!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_user_tag_assignments_user',
  })
  user?: User;

  @ManyToOne(() => UserTag, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'kind',
    foreignKeyConstraintName: 'FK_user_tag_assignments_tag',
  })
  userTag?: UserTag;

  @CreateDateColumn({ name: 'awarded_at', type: 'timestamptz' })
  awardedAt!: Date;
}
