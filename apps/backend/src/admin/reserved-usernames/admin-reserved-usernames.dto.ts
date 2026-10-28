import {
  RESERVED_USERNAME_CATEGORIES,
  RESERVED_USERNAME_NOTE_MAX_LENGTH,
  type ReservedUsernameCategory,
} from '@kilotrace/shared/admin';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TrimToNull } from '../../common/transformers';
import { UsernameField } from '../../users/dto/user-fields';

export class ReserveUsernameDto {
  @UsernameField()
  username!: string;

  @IsIn(RESERVED_USERNAME_CATEGORIES)
  category!: ReservedUsernameCategory;

  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(RESERVED_USERNAME_NOTE_MAX_LENGTH)
  note?: string | null;
}
