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

export enum EmailChallengePurpose {
  /** Sign-up waiting for its code: the account only exists once it is entered. */
  Signup = 'signup',
  PasswordReset = 'password_reset',
}

/** A code sent: only its keyed hash is stored. */
export interface StoredCode {
  hash: string;
  expiresAt: string;
}

/**
 * The proof of an email address in progress, one per address and purpose.
 * Several codes may be valid at once: sending another one keeps the earlier
 * ones until they expire.
 */
@Entity('email_challenges')
@Index('IDX_email_challenges_purpose_email', ['purpose', 'email'], {
  unique: true,
})
export class EmailChallenge {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_email_challenges',
  })
  id!: string;

  @Column({
    type: 'enum',
    enum: EmailChallengePurpose,
    enumName: 'email_challenge_purpose',
  })
  purpose!: EmailChallengePurpose;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  /**
   * The account concerned: the one of a password reset, or, at sign-up, the
   * one already owning the address, which is warned instead of sent a code.
   */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_email_challenges_user',
  })
  user?: User;

  /** Sign-up only: the account to create. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  @Index('IDX_email_challenges_username')
  username!: string | null;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordHash!: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  codes!: StoredCode[];

  /** Wrong codes since the last one sent: at the limit, every code is dropped. */
  @Column({ name: 'failed_attempts', type: 'int', default: 0 })
  failedAttempts!: number;

  @Column({ name: 'send_count', type: 'int', default: 0 })
  sendCount!: number;

  @Column({
    name: 'send_window_started_at',
    type: 'timestamptz',
    nullable: true,
  })
  sendWindowStartedAt!: Date | null;

  @Column({ name: 'last_sent_at', type: 'timestamptz', nullable: true })
  lastSentAt!: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  @Index('IDX_email_challenges_expires_at')
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
