import {
  STATION_REPORT_DISMISSALS,
  STATION_REPORT_NOTE_MAX_LENGTH,
  type StationReportDismissal,
} from '@kilotrace/shared';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** An acceptance or a completion: the note told to the author is optional. */
export class DecideStationReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(STATION_REPORT_NOTE_MAX_LENGTH)
  note?: string | null;
}

export class DismissStationReportDto extends DecideStationReportDto {
  @IsIn(STATION_REPORT_DISMISSALS)
  dismissal!: StationReportDismissal;
}
