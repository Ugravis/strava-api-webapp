import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Place } from './place.entity';

/**
 * Two stations connected by passenger tracks without any station between them,
 * and the tracks joining them. Shared by every user: a link is unlocked
 * once its two stations are visited.
 */
@Entity('rail_links')
@Index(['stationA', 'stationB'], { unique: true })
@Index(['stationB'])
@Check('"station_a" < "station_b"')
export class RailLink {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'station_a', type: 'integer' })
  stationA!: number;

  @ManyToOne(() => Place, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'station_a' })
  a?: Place;

  @Column({ name: 'station_b', type: 'integer' })
  stationB!: number;

  @ManyToOne(() => Place, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'station_b' })
  b?: Place;

  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'LineString',
    srid: 4326,
  })
  geom!: string;

  @Column({ name: 'length_m', type: 'real' })
  lengthM!: number;
}
