import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Country } from '../countries/country.entity';

/** Kinds of the places collected on the map. */
export type PlaceKind = 'station';

/**
 * A point of interest of the map, imported from OpenStreetMap. Geographic
 * data only: a place is visited when the small tile holding it is.
 */
@Entity('places')
@Index(['osmType', 'osmId'], { unique: true })
@Index(['x', 'y'])
export class Place {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 16 })
  kind!: PlaceKind;

  /** `n` (node), `w` (way) or `r` (relation). */
  @Column({ name: 'osm_type', type: 'char', length: 1 })
  osmType!: string;

  @Column({ name: 'osm_id', type: 'bigint' })
  osmId!: string;

  @Column({ type: 'text', nullable: true })
  name!: string | null;

  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  geom!: string;

  /**
   * Country holding the place, or the nearest one for a place on the coast;
   * null far from every country.
   */
  @Index()
  @Column({ name: 'country_code', type: 'char', length: 2, nullable: true })
  countryCode!: string | null;

  @ManyToOne(() => Country, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'country_code' })
  country?: Country;

  /** Large tile (zoom 14) holding the place. */
  @Column({ type: 'integer' })
  x!: number;

  @Column({ type: 'integer' })
  y!: number;

  /** Small tile (zoom 17) holding the place: its bit in the mask of the large tile. */
  @Column({ type: 'smallint' })
  bit!: number;

  /** Last import changing the place: the vector tiles of the places follow it. */
  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt!: Date;
}
