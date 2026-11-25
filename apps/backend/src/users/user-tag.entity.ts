import type { Translations } from '@kilotrace/shared';
import type { UserTagTranslatedField } from '@kilotrace/shared/admin';
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * A badge owed to the membership, not to sport, managed from the back
 * office. `system` ones are awarded by the code and cannot be deleted.
 */
@Entity('user_tags')
export class UserTag {
  /** Stable slug, e.g. `founder`. */
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  /** Display name, in French. */
  @Column({ type: 'varchar', length: 40 })
  name!: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  description!: string | null;

  /** Name and description in the other languages of the site; the fields above are the French source. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  translations!: Translations<UserTagTranslatedField>;

  /** Key resolved by the clients, which fall back on a generic icon. */
  @Column({ type: 'varchar', length: 40 })
  icon!: string;

  /** `#rrggbb` of the icon; null for the default one. */
  @Column({ type: 'varchar', length: 7, nullable: true })
  color!: string | null;

  /** Display order, ascending. */
  @Column({ type: 'integer' })
  position!: number;

  @Column({ type: 'boolean', default: false })
  system!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
