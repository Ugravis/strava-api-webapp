import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * A country with all its territories (overseas regions and dependencies
 * included), imported from Overture Maps. Geographic data only.
 */
@Entity('countries')
export class Country {
  /** ISO 3166-1 alpha-2 code. */
  @PrimaryColumn({ type: 'char', length: 2 })
  code!: string;

  /** Large tiles (zoom 14) touching the country; null until computed. */
  @Column({ name: 'total_tiles', type: 'integer', nullable: true })
  totalTiles!: number | null;

  /** Small tiles (zoom 17) touching the country; null until computed. */
  @Column({ name: 'total_subtiles', type: 'bigint', nullable: true })
  totalSubtiles!: string | null;

  /** Simplified outline (about 500 m), for display only. */
  @Column({
    type: 'geometry',
    spatialFeatureType: 'MultiPolygon',
    srid: 4326,
  })
  outline!: string;
}
