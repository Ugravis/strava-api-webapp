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
  /** `major.minor.patch`, e.g. `0.3.0`. */
  @PrimaryColumn({
    type: 'varchar',
    length: 16,
    primaryKeyConstraintName: 'PK_release_notes',
  })
  version!: string;

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

  /** When the users were notified; cleared once the notifications are withdrawn. */
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
