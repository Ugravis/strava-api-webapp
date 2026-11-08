import {
  ADMIN_BUSINESS_PERIODS,
  type AdminBusinessPeriod,
} from '@kilotrace/shared/admin';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class AdminBusinessStatisticsQueryDto {
  @IsOptional()
  @IsIn(ADMIN_BUSINESS_PERIODS)
  period: AdminBusinessPeriod = '30';

  /** Whether the members of the back-office team are counted. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  team: boolean = false;
}
