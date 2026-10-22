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

  /** Display order, ascending. */
  @Column({ type: 'integer' })
  position!: number;
}
