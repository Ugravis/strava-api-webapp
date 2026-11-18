import {
  STATION_REPORT_DETAILS_MAX_LENGTH,
  STATION_REPORT_REASONS,
  type StationReportReason,
  USER_REPORT_DETAILS_MAX_LENGTH,
  USER_REPORT_REASONS,
  type UserReportReason,
} from '@kilotrace/shared';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ReportUserDto {
  @IsIn(USER_REPORT_REASONS)
  reason!: UserReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(USER_REPORT_DETAILS_MAX_LENGTH)
  details?: string | null;
}

export class ReportStationDto {
  @IsIn(STATION_REPORT_REASONS)
  reason!: StationReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(STATION_REPORT_DETAILS_MAX_LENGTH)
  details?: string | null;

  /** The station reported from its panel; none from the band of the map. */
  @IsOptional()
  @IsInt()
  @Min(1)
  stationId?: number | null;
}
