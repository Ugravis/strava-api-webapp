import { IsTimeZone } from 'class-validator';

export class UpdateTimeZoneDto {
  /** An IANA time zone, e.g. `Europe/Paris`. */
  @IsTimeZone()
  timeZone!: string;
}
