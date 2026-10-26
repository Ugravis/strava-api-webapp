import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Country } from './country.entity';

/**
 * Countries touched by a large tile (zoom 14), with the mask of its small
 * tiles touching each one (same bit layout as `activity_tiles`). Geographic
 * data only, shared by every user; filled for the visited tiles.
 */
@Entity('tile_countries')
export class TileCountry {
  @PrimaryColumn({ type: 'integer' })
  x!: number;

  @PrimaryColumn({ type: 'integer' })
  y!: number;

  @PrimaryColumn({ name: 'country_code', type: 'char', length: 2 })
  countryCode!: string;

  @ManyToOne(() => Country, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'country_code' })
  country?: Country;

  /** Small tiles touching the country, signed like the tile masks. */
  @Column({ type: 'bigint' })
  mask!: string;
}
