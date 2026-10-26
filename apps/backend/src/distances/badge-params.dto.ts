import { IsString, Matches, MaxLength } from 'class-validator';

export class BadgeParamsDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9_]+$/)
  id!: string;
}
