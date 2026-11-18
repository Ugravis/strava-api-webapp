import { ADMIN_STATION_NAME_MAX_LENGTH } from '@kilotrace/shared/admin';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../../common/transformers';

/** Its name for the site, null for the one of OpenStreetMap again. */
export class RenameStationDto {
  @ValidateIf((_, value) => value !== null)
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(ADMIN_STATION_NAME_MAX_LENGTH)
  name!: string | null;
}

/** Hidden from the site or shown again, the reason kept in the log. */
export class HideStationDto {
  @IsBoolean()
  hidden!: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
