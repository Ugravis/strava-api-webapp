import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/** A user following another one; a user never follows themselves. */
@Entity('follows')
@Check('CHK_follows_not_self', '"follower_id" <> "followed_id"')
@Index('IDX_follows_followed', ['followedId', 'createdAt'])
@Index('IDX_follows_requests', ['followedId', 'createdAt'], {
  where: '"pending"',
})
export class Follow {
  @PrimaryColumn({ name: 'follower_id', type: 'uuid' })
  followerId!: string;

  @PrimaryColumn({ name: 'followed_id', type: 'uuid' })
  followedId!: string;

  /** A request to follow a private profile, until its owner accepts it. */
  @Column({ type: 'boolean', default: false })
  pending!: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_id' })
  follower?: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followed_id' })
  followed?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
