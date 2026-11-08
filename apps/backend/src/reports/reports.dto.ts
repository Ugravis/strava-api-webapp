import {
  USER_REPORT_DETAILS_MAX_LENGTH,
  USER_REPORT_REASONS,
  type UserReportReason,
} from '@kilotrace/shared';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportUserDto {
  @IsIn(USER_REPORT_REASONS)
  reason!: UserReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(USER_REPORT_DETAILS_MAX_LENGTH)
  details?: string | null;
}
