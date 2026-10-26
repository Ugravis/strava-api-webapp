import {
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * A user liking the profile of another one, once at most. Only the count is
 * shown: who liked a profile is never disclosed.
 */
@Entity('profile_likes')
@Check('CHK_profile_likes_not_self', '"user_id" <> "profile_id"')
@Index('IDX_profile_likes_profile', ['profileId'])
export class ProfileLike {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'profile_id', type: 'uuid' })
  profileId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profile_id' })
  profile?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
