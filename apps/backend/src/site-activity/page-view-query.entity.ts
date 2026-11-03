import { Column, Entity, PrimaryColumn } from 'typeorm';

/** A query string a page view had while visible, `""` for none. Deleted with its view. */
@Entity('page_view_queries')
export class PageViewQuery {
  @PrimaryColumn({ name: 'view_id', type: 'uuid' })
  viewId!: string;

  /** Without its `?`. */
  @PrimaryColumn({ type: 'varchar', length: 500 })
  query!: string;

  /** Time visible with this query string. */
  @Column({ name: 'duration_ms', type: 'integer', default: 0 })
  durationMs!: number;
}
