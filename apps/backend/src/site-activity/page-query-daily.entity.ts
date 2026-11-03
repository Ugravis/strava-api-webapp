import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Query parameters of the page views older than 90 days, summed up per
 * day, without the users; the values of an id gathered as `[id]`.
 */
@Entity('page_query_daily')
export class PageQueryDaily {
  @PrimaryColumn({ type: 'date' })
  day!: string;

  @PrimaryColumn({ type: 'varchar', length: 200 })
  path!: string;

  @PrimaryColumn({ type: 'varchar', length: 100 })
  key!: string;

  @PrimaryColumn({ type: 'varchar', length: 200 })
  value!: string;

  /** Whether the views are those of members of the back-office team, at the time of the summary. */
  @PrimaryColumn({ type: 'boolean' })
  team!: boolean;

  @Column({ type: 'integer' })
  views!: number;

  /** Distinct users of the day: they cannot be summed over a longer period. */
  @Column({ type: 'integer' })
  users!: number;

  @Column({ name: 'duration_ms', type: 'bigint' })
  durationMs!: string;
}
