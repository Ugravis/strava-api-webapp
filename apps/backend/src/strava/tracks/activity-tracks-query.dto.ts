import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ActivityTracksQueryDto {
  /** Only activities started after this date. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  after?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page: number = 1;
}
