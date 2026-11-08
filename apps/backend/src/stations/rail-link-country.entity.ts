import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Country } from '../countries/country.entity';
import { RailLink } from './rail-link.entity';

/**
 * Share of a link in a country it crosses, in proportion of its length in
 * each: the network of a country is the sum of its shares.
 */
@Entity('rail_link_countries')
@Index(['countryCode'])
export class RailLinkCountry {
  @PrimaryColumn({ name: 'link_id', type: 'integer' })
  linkId!: number;

  @PrimaryColumn({ name: 'country_code', type: 'char', length: 2 })
  countryCode!: string;

  @ManyToOne(() => RailLink, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'link_id' })
  link?: RailLink;

  @ManyToOne(() => Country, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'country_code' })
  country?: Country;

  @Column({ name: 'length_m', type: 'real' })
  lengthM!: number;
}
