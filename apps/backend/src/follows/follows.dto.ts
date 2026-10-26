import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { USERNAME_PATTERN } from '@kilotrace/shared';
import { NormalizeIdentifier, Trim } from '../common/transformers';

export class UsernameParamsDto {
  @NormalizeIdentifier()
  @IsString()
  @Matches(USERNAME_PATTERN)
  username!: string;
}

export class SearchProfilesQueryDto {
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  q!: string;

  /** Users skipped, in the order of the results. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}

export class FollowsPageQueryDto {
  /** Users skipped, the latest followed first. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}

export class SetPrivacyDto {
  @IsBoolean()
  private!: boolean;
}
