import type { AdminRole } from '@kilotrace/shared/admin';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { FavoriteSport } from './favorite-sports';

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

  /** Short presentation shown on the profile. */
  @Column({ type: 'varchar', length: 160, nullable: true })
  bio!: string | null;

  /** Free text, typed by the user: never derived from their activities. */
  @Column({ type: 'varchar', length: 60, nullable: true })
  city!: string | null;

  /** Country of the city, ISO 3166-1 alpha-2; set along with it. */
  @Column({ name: 'country_code', type: 'char', length: 2, nullable: true })
  countryCode!: string | null;

  @Column({
    name: 'favorite_sports',
    type: 'varchar',
    length: 16,
    array: true,
    default: () => "'{}'",
  })
  favoriteSports!: FavoriteSport[];

  /** Hue of the profile, `#rrggbb`; null for the default one. */
  @Column({ name: 'profile_color', type: 'varchar', length: 7, nullable: true })
  profileColor!: string | null;

  /** A private profile shows its badges, statistics and follows to accepted followers only. */
  @Column({ name: 'profile_private', type: 'boolean', default: true })
  profilePrivate!: boolean;

  /**
   * Back-office roles, read from the database on every admin request. Never
   * part of a response outside `/api/admin`.
   */
  @Column({
    type: 'varchar',
    length: 20,
    array: true,
    default: () => "'{}'",
  })
  roles!: AdminRole[];

  /** Set by the back office: sign-in refused and profile hidden meanwhile. */
  @Column({ name: 'suspended_at', type: 'timestamptz', nullable: true })
  suspendedAt!: Date | null;

  /** End of the suspension; null for an indefinite one. */
  @Column({ name: 'suspended_until', type: 'timestamptz', nullable: true })
  suspendedUntil!: Date | null;

  /** Shown to the user when a sign-in is refused. */
  @Column({
    name: 'suspension_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  suspensionReason!: string | null;

  /** When the terms of use were accepted, kept as proof of consent. */
  @Column({ name: 'terms_accepted_at', type: 'timestamptz', nullable: true })
  termsAcceptedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

/** Whether a suspension is in force, an expired one ending by itself. */
export function isSuspended(user: User, now = new Date()): boolean {
  return (
    user.suspendedAt !== null &&
    (user.suspendedUntil === null || user.suspendedUntil > now)
  );
}
