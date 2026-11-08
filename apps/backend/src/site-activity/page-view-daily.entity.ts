import type { PageViewDevice } from '@kilotrace/shared';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Page views older than 90 days, summed up per UTC hour, without the users. */
@Entity('page_view_daily')
export class PageViewDaily {
  @PrimaryColumn({ type: 'date' })
  day!: string;

  /** UTC hour, 0 to 23. */
  @PrimaryColumn({ type: 'smallint' })
  hour!: number;

  @PrimaryColumn({ type: 'varchar', length: 200 })
  path!: string;

  @PrimaryColumn({ type: 'varchar', length: 10 })
  device!: PageViewDevice;

  /** Whether the views are those of members of the back-office team, at the time of the summary. */
  @PrimaryColumn({ type: 'boolean' })
  team!: boolean;

  @Column({ type: 'integer' })
  views!: number;

  /** Distinct users of the hour: they cannot be summed over a longer period. */
  @Column({ type: 'integer' })
  users!: number;

  @Column({ name: 'duration_ms', type: 'bigint' })
  durationMs!: string;
}
