import { IsOptional } from 'class-validator';
import { DisplayNameField, UsernameField } from './user-fields';

export class UpdateProfileDto {
  @IsOptional()
  @DisplayNameField()
  displayName?: string;

  @IsOptional()
  @UsernameField()
  username?: string;
}
