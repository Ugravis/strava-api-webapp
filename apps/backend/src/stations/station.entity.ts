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

  /** Code of the station for the railways (`uic_ref`). */
  @Column({ name: 'uic_ref', type: 'text', nullable: true })
  uicRef!: string | null;
}
