import {
  ADMIN_SITE_ACTIVITY_PERIODS,
  type AdminSiteActivityPeriod,
} from '@kilotrace/shared/admin';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class AdminSiteActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn(ADMIN_SITE_ACTIVITY_PERIODS)
  days: AdminSiteActivityPeriod = 30;

  /** Whether the members of the back-office team are counted. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  team: boolean = false;
}
