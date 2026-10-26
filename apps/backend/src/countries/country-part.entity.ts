import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Country } from './country.entity';

/**
 * Full precision land area of a country, subdivided into small polygons so
 * that the spatial index stays selective. In Web Mercator (EPSG:3857), the
 * projection of the tile envelopes.
 */
@Entity('country_parts')
export class CountryPart {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'country_code', type: 'char', length: 2 })
  countryCode!: string;

  @ManyToOne(() => Country, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'country_code' })
  country?: Country;

  @Index({ spatial: true })
  @Column({ type: 'geometry', spatialFeatureType: 'Polygon', srid: 3857 })
  geom!: string;
}
