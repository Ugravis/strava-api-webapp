import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class BadgeHistoryQueryDto {
  /** Completions skipped, the latest first. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
