import {
  PAGE_VIEW_DEVICES,
  PAGE_VIEW_DURATION_MAX_MS,
  PAGE_VIEW_PATH_MAX,
  PAGE_VIEW_QUERIES_MAX,
  PAGE_VIEW_QUERY_MAX,
  type PageViewBeacon,
  type PageViewDevice,
} from '@kilotrace/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PageViewQueryDto {
  @IsString()
  @MaxLength(PAGE_VIEW_QUERY_MAX)
  @Matches(/^[^?#\s]*$/)
  query!: string;

  @IsInt()
  @Min(0)
  @Max(PAGE_VIEW_DURATION_MAX_MS)
  durationMs!: number;
}

export class PageViewBeaconDto implements PageViewBeacon {
  @IsUUID()
  id!: string;

  @MaxLength(PAGE_VIEW_PATH_MAX)
  @Matches(/^\/[^?#\s]*$/)
  path!: string;

  @IsIn(PAGE_VIEW_DEVICES)
  device!: PageViewDevice;

  @IsInt()
  @Min(0)
  @Max(PAGE_VIEW_DURATION_MAX_MS)
  durationMs!: number;

  @IsArray()
  @ArrayMaxSize(PAGE_VIEW_QUERIES_MAX)
  @ValidateNested({ each: true })
  @Type(() => PageViewQueryDto)
  queries!: PageViewQueryDto[];
}
