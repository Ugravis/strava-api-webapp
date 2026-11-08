import {
  MODERATABLE_FIELDS,
  type ModeratableField,
  USER_REPORT_SANCTIONS,
  type UserReportSanction,
} from '@kilotrace/shared/admin';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReasonDto } from '../users/admin-users.dto';

export class SanctionUserReportDto extends ReasonDto {
  @IsIn(USER_REPORT_SANCTIONS)
  sanction!: UserReportSanction;

  @ValidateIf((dto: SanctionUserReportDto) => dto.sanction === 'moderation')
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(MODERATABLE_FIELDS, { each: true })
  fields?: ModeratableField[];

  @IsOptional()
  @IsDateString({ strict: true })
  until?: string;
}

export class RelatedReportsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
