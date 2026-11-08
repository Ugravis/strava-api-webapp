import type { PageViewDevice } from '@kilotrace/shared';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * A page seen by a signed-in user. Kept 90 days, then summed up in
 * `page_view_daily` without the user.
 */
@Entity('page_views')
@Index(['at'])
@Index(['userId', 'at'])
export class PageView {
  /** Drawn by the browser, so that each beacon of a view updates the same row. */
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** Route of the page, without its query string. */
  @Column({ type: 'varchar', length: 200 })
  path!: string;

  /** When the page was opened. */
  @Column({ type: 'timestamptz' })
  at!: Date;

  @Column({ type: 'varchar', length: 10 })
  device!: PageViewDevice;

  /** Time the page was visible, the hidden tab excluded. */
  @Column({ name: 'duration_ms', type: 'integer', default: 0 })
  durationMs!: number;
}
