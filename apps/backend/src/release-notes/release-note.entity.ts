import type { ReleaseNoteDisplay } from '@kilotrace/shared';
import type { ReleaseNoteStatus } from '@kilotrace/shared/admin';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A release of the site and its note: one row per version, recorded by the
 * backend the first time it starts on it, or written ahead by the team.
 */
@Entity('release_notes')
export class ReleaseNote {
  /** Semantic Versioning, e.g. `0.3.0` or `1.0.0-beta.1`. */
  @PrimaryColumn({
    type: 'varchar',
    length: 40,
    primaryKeyConstraintName: 'PK_release_notes',
  })
  version!: string;

  /** `versionSortKey` of the version: sorted as text, in the order of the versions. */
  @Column({
    name: 'version_order',
    type: 'varchar',
    length: 200,
    collation: 'C',
  })
  versionOrder!: string;

  /** First start of the backend on this version; null while it is not out. */
  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt!: Date | null;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status!: ReleaseNoteStatus;

  @Column({ type: 'varchar', length: 16 })
  display!: ReleaseNoteDisplay;

  @Column({ type: 'varchar', length: 80, nullable: true })
  title!: string | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  summary!: string | null;

  /** Markdown of the parts: new features, improvements, fixes, the rest. */
  @Column({ name: 'section_new', type: 'text', nullable: true })
  sectionNew!: string | null;

  @Column({ name: 'section_improved', type: 'text', nullable: true })
  sectionImproved!: string | null;

  @Column({ name: 'section_fixed', type: 'text', nullable: true })
  sectionFixed!: string | null;

  @Column({ name: 'section_other', type: 'text', nullable: true })
  sectionOther!: string | null;

  /** Hidden from the users once published, null while shown. */
  @Column({ name: 'disabled_at', type: 'timestamptz', nullable: true })
  disabledAt!: Date | null;

  /** Storage key of the banner image, null without one. */
  @Column({ name: 'banner_key', type: 'varchar', length: 200, nullable: true })
  bannerKey!: string | null;

  /** The release on GitHub, null without one. */
  @Column({ name: 'github_url', type: 'varchar', length: 300, nullable: true })
  githubUrl!: string | null;

  /** When the users were notified: once only, even after the note is disabled and enabled again. */
  @Column({ name: 'notified_at', type: 'timestamptz', nullable: true })
  notifiedAt!: Date | null;

  /** Null for a row recorded by the release itself. */
  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
