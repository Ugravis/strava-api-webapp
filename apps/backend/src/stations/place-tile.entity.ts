import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Place } from './place.entity';

/**
 * A small tile (zoom 17) of the zone of a place: the place is visited once
 * any of them is. Encoded as `places.x/y/bit`: its large tile and its bit.
 */
@Entity('place_tiles')
@Index(['x', 'y'])
export class PlaceTile {
  @PrimaryColumn({ name: 'place_id', type: 'integer' })
  placeId!: number;

  @PrimaryColumn({ type: 'integer' })
  x!: number;

  @PrimaryColumn({ type: 'integer' })
  y!: number;

  @PrimaryColumn({ type: 'smallint' })
  bit!: number;

  @ManyToOne(() => Place, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'place_id' })
  place?: Place;
}
