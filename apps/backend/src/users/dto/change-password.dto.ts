import { IsOptional } from 'class-validator';
import { CurrentPasswordField, PasswordField } from './user-fields';

export class ChangePasswordDto {
  /** Required when the account already has a password. */
  @IsOptional()
  @CurrentPasswordField()
  currentPassword?: string;

  @PasswordField()
  newPassword!: string;
}
