import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import type { BadgeMetric } from './badge-metrics';
import { BadgeTheme } from './badge-theme.entity';
import type { DistanceFamily } from './distance-families';

/**
 * A known amount (a distance, a duration, a count…) the cumulated amount of a
 * metric is compared to. The catalog is shared by every user and maintained
 * through migrations.
 */
@Entity('badges')
export class Badge {
  /** Stable slug, e.g. `marathon`. */
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 16, default: 'distance' })
  metric!: BadgeMetric;

  /** Sports counted; `all` for the metrics not tied to a sport. */
  @Column({ type: 'varchar', length: 16 })
  family!: DistanceFamily;

  /**
   * Amount of one iteration, in the unit of the metric. A tiered badge, which
   * is completed only once, holds its last tier.
   */
  @Column({ type: 'double precision' })
  target!: number;

  /**
   * Amounts reaching each tier, ascending, of a badge completed only once
   * (the challenges); null for a repeatable badge.
   */
  @Column({ type: 'double precision', array: true, nullable: true })
  tiers!: number[] | null;

  /** Display name, in French. */
  @Column({ type: 'varchar', length: 80 })
  name!: string;

  /** Display description, in French. */
  @Column({ type: 'varchar', length: 300 })
  description!: string;

  /** Theme of the badge, if any. */
  @Column({ name: 'theme_id', type: 'varchar', length: 32, nullable: true })
  themeId!: string | null;

  @ManyToOne(() => BadgeTheme, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'theme_id' })
  theme?: BadgeTheme;

  /** Icon key, resolved by the clients; unknown keys get a generic icon. */
  @Column({ type: 'varchar', length: 40 })
  icon!: string;

  /** Background color of the card, `#rrggbb`; exclusive with the image. */
  @Column({
    name: 'background_color',
    type: 'varchar',
    length: 7,
    nullable: true,
  })
  backgroundColor!: string | null;

  /** Background image of the card, a URL; exclusive with the color. */
  @Column({
    name: 'background_image',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  backgroundImage!: string | null;

  /** Display order, ascending. */
  @Column({ type: 'integer' })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
