import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Always stored lowercased, see `normalizeEmail`. */
  @Column({ type: 'varchar', length: 320, unique: true })
  email!: string;

  /** Null for accounts created through an OAuth provider only. */
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordHash!: string | null;

  /** Always stored lowercased, see `USERNAME_PATTERN`. */
  @Column({ type: 'varchar', length: 20, unique: true })
  username!: string;

  /** Optional public name; the username is shown when it is not set. */
  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  displayName!: string | null;

  /** Storage key of the uploaded avatar. */
  @Column({ name: 'avatar_key', type: 'varchar', length: 255, nullable: true })
  avatarKey!: string | null;

  /** Avatar provided by an OAuth provider, used when no avatar was uploaded. */
  @Column({ name: 'external_avatar_url', type: 'text', nullable: true })
  externalAvatarUrl!: string | null;

  /** When the terms of use were accepted, kept as proof of consent. */
  @Column({ name: 'terms_accepted_at', type: 'timestamptz', nullable: true })
  termsAcceptedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
