import {
  MAINTENANCE_DESCRIPTION_MAX_LENGTH,
  MAINTENANCE_TITLES,
  type MaintenanceTitle,
} from '@kilotrace/shared';
import {
  IsBoolean,
  IsIn,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TrimToNull } from '../../common/transformers';

export class SetMaintenanceDto {
  @IsIn(MAINTENANCE_TITLES)
  title!: MaintenanceTitle;

  @ValidateIf((_, value) => value !== null)
  @TrimToNull()
  @IsString()
  @MaxLength(MAINTENANCE_DESCRIPTION_MAX_LENGTH)
  description!: string | null;
}

export class SetSignupsDto {
  @IsBoolean()
  enabled!: boolean;
}
