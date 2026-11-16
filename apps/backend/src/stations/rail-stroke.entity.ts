import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A line of the railway, its segments joined where it runs straight on,
 * simplified for the zoomed-out maps: shown whole from `minZoom`, the
 * longer the earlier. Rebuilt from the segments by each import.
 */
@Entity('rail_strokes')
export class RailStroke {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('IDX_rail_strokes_min_zoom')
  @Column({ name: 'min_zoom', type: 'smallint' })
  minZoom!: number;

  @Index('IDX_rail_strokes_geom', { spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'MultiLineString',
    srid: 4326,
  })
  geom!: string;
}
