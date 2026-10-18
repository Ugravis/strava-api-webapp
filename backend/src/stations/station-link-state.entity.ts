import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Place } from './place.entity';

/**
 * Links to find from a station, created once a user visits it: the walk
 * along the tracks needs the railway of every region it reaches, fetched on
 * demand. Reset when the stations or the railway around it change.
 */
@Entity('station_link_states')
export class StationLinkState {
  @PrimaryColumn({ name: 'place_id', type: 'integer' })
  placeId!: number;

  @OneToOne(() => Place, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'place_id' })
  place?: Place;

  /** Last walk, complete or waiting for regions; null before the first one. */
  @Column({ name: 'checked_at', type: 'timestamptz', nullable: true })
  checkedAt!: Date | null;

  /** When the links were found; null while regions are missing. */
  @Column({ name: 'linked_at', type: 'timestamptz', nullable: true })
  linkedAt!: Date | null;
}
