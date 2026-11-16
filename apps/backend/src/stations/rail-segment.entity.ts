import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A stretch of railway shared by one or more links, cut where they diverge:
 * drawn once whatever the number of links over it, so their ties never
 * overlap. Only for the drawing: trains and unlocks use `rail_links`.
 */
@Entity('rail_segments')
export class RailSegment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'LineString',
    srid: 4326,
  })
  geom!: string;

  /** Zoom from which the line of the segment shows (`rail_strokes`), whole. */
  @Column({ name: 'min_zoom', type: 'smallint', default: 0 })
  minZoom!: number;

  /** The links running over the segment. */
  @Column({ name: 'link_ids', type: 'integer', array: true })
  linkIds!: number[];
}
