import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/** A calendar year of the activities. */
export class ActivityDaysQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(2100)
  year!: number;
}
