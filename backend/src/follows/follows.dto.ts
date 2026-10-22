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
import { NormalizeIdentifier, Trim } from '../common/transformers';
import { USERNAME_PATTERN } from '../users/username.util';

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
