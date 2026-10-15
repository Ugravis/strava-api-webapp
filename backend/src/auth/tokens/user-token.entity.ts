import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

export enum UserTokenPurpose {
  PasswordReset = 'password_reset',
}

/** Single-use token sent by email. Only its hash is stored. */
@Entity('user_tokens')
export class UserToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({
    type: 'enum',
    enum: UserTokenPurpose,
    enumName: 'user_token_purpose',
  })
  purpose!: UserTokenPurpose;

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
