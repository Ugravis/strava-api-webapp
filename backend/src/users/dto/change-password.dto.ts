import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PasswordField } from './user-fields';
import { PASSWORD_MAX_LENGTH } from './validation.constants';

export class ChangePasswordDto {
  /** Required when the account already has a password. */
  @IsOptional()
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword?: string;

  @PasswordField()
  newPassword!: string;
}
