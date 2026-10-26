import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

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

  /**
   * Union of the large tiles touching the country, in Web Mercator: drawn
   * on the map, the sea and the lakes of the base map over it. Computed
   * with the totals.
   */
  @Index({ spatial: true })
  @Column({
    name: 'tile_shape',
    type: 'geometry',
    spatialFeatureType: 'MultiPolygon',
    srid: 3857,
    nullable: true,
  })
  tileShape!: string | null;

  /**
   * Bounding box of the main landmass of the country, in Web Mercator: the
   * map frames it rather than every territory overseas. Computed when the
   * country is first shown as a sector.
   */
  @Column({
    name: 'focus_bounds',
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 3857,
    nullable: true,
  })
  focusBounds!: string | null;

  /**
   * Last time a user looked at the country as a sector while its totals
   * were missing: the worker computes them, after the visited countries.
   */
  @Column({ name: 'requested_at', type: 'timestamptz', nullable: true })
  requestedAt!: Date | null;

  /** When the totals and the tile shape were computed. */
  @Column({ name: 'computed_at', type: 'timestamptz', nullable: true })
  computedAt!: Date | null;
}
