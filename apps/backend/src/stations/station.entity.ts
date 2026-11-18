import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Place } from './place.entity';

/**
 * What only a train station has, beside its place: one row per place of
 * kind `station`, refreshed by the imports.
 */
@Entity('stations')
export class Station {
  @PrimaryColumn({ name: 'place_id', type: 'integer' })
  placeId!: number;

  @OneToOne(() => Place, (place) => place.station, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'place_id' })
  place?: Place;

  /** A tourist or heritage train, by its tags, routes or track. */
  @Column({ type: 'boolean', default: false })
  tourist!: boolean;

  /** Train routes stopping at the station or in its stop areas: its importance. */
  @Column({ type: 'integer', default: 0 })
  routes!: number;

  @Column({ type: 'text', nullable: true })
  operator!: string | null;

  @Column({ type: 'text', nullable: true })
  network!: string | null;

  /** Stations linked to it by the railway, counted by the imports (`COUNT_STATION_LINKS`). */
  @Column({ type: 'integer', default: 0 })
  links!: number;

  /** Length of these links, in metres. */
  @Column({ name: 'links_m', type: 'integer', default: 0 })
  linksM!: number;

  /** Code of the station for the railways (`uic_ref`). */
  @Column({ name: 'uic_ref', type: 'text', nullable: true })
  uicRef!: string | null;
}
