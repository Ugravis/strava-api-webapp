import type { Translations } from '@kilotrace/shared';
import type { BadgeThemeTranslatedField } from '@kilotrace/shared/admin';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/** A theme gathering badges across families, e.g. astronomy. */
@Entity('badge_themes')
export class BadgeTheme {
  /** Stable slug, e.g. `astronomy`. */
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  /** Display name, in French. */
  @Column({ type: 'varchar', length: 40 })
  name!: string;

  /** Name in the other languages of the site; the fields above are the French source. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  translations!: Translations<BadgeThemeTranslatedField>;

  /** The French each translation was made from: one whose source changed since is out of date. */
  @Column({
    name: 'translation_sources',
    type: 'jsonb',
    default: () => "'{}'",
  })
  translationSources!: Translations<BadgeThemeTranslatedField>;

  /** Display order, ascending. */
  @Column({ type: 'integer' })
  position!: number;
}
