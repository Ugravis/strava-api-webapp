import { IsOptional } from 'class-validator';
import { OptionalDisplayNameField, UsernameField } from './user-fields';

export class UpdateProfileDto {
  @OptionalDisplayNameField()
  displayName?: string | null;

  @IsOptional()
  @UsernameField()
  username?: string;
}
