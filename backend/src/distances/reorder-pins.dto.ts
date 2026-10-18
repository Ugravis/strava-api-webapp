import { ArrayMaxSize, IsArray, IsString, Matches } from 'class-validator';

export class ReorderPinsDto {
  /** Pinned badges in their new order. */
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @Matches(/^[a-z0-9_]{1,64}$/, { each: true })
  badgeIds!: string[];
}
