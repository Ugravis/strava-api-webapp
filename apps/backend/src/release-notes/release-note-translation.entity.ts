import { Column, Entity, PrimaryColumn } from 'typeorm';

/** The texts of a release note in a language other than French, its source; a field null falls back on English, then on French. */
@Entity('release_note_translations')
export class ReleaseNoteTranslation {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  version!: string;

  @PrimaryColumn({ type: 'varchar', length: 5 })
  locale!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  title!: string | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  summary!: string | null;

  @Column({ name: 'section_new', type: 'text', nullable: true })
  sectionNew!: string | null;

  @Column({ name: 'section_improved', type: 'text', nullable: true })
  sectionImproved!: string | null;

  @Column({ name: 'section_fixed', type: 'text', nullable: true })
  sectionFixed!: string | null;

  @Column({ name: 'section_other', type: 'text', nullable: true })
  sectionOther!: string | null;

  /** The French each field was translated from, by field name (`title`, `new`…). */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  sources!: Partial<Record<string, string>>;
}
