import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * A track of the railway as an OSM way: its nodes in order, which make the
 * graph walked between the stations, and its line through them.
 */
@Entity('rail_ways')
export class RailWay {
  @PrimaryColumn({ name: 'osm_id', type: 'bigint' })
  osmId!: string;

  @Column({ type: 'bigint', array: true })
  nodes!: string[];

  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'LineString',
    srid: 4326,
  })
  geom!: string;
}
