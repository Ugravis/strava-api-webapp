import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Country } from './country.entity';

/**
 * A country visited by a user: the number of their large tiles touching it,
 * kept by the changes of their tiles (`refresh_user_tiles`) and by the
 * tiles located since (`CountriesService.locateTiles`). The visitors of a
 * country are its rows, a row gone with its last tile.
 */
@Entity('user_countries')
export class UserCountry {
  @PrimaryColumn({
    name: 'user_id',
    type: 'uuid',
    primaryKeyConstraintName: 'PK_user_countries',
  })
  userId!: string;

  @Index('IDX_user_countries_country')
  @PrimaryColumn({
    name: 'country_code',
    type: 'char',
    length: 2,
    primaryKeyConstraintName: 'PK_user_countries',
  })
  countryCode!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_user_countries_user',
  })
  user?: User;

  @ManyToOne(() => Country, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'country_code',
    foreignKeyConstraintName: 'FK_user_countries_country',
  })
  country?: Country;

  /** Large tiles (zoom 14) of the user touching the country. */
  @Column({ type: 'integer' })
  tiles!: number;
}
