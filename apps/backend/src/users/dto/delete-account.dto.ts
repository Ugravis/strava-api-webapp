import { IsOptional, IsString, MaxLength } from 'class-validator';
import { NormalizeIdentifier } from '../../common/transformers';
import { CurrentPasswordField } from './user-fields';

/** Accounts with a password confirm with it, OAuth-only accounts with their username. */
export class DeleteAccountDto {
  @IsOptional()
  @CurrentPasswordField()
  password?: string;

  @IsOptional()
  @NormalizeIdentifier()
  @IsString()
  @MaxLength(50)
  usernameConfirmation?: string;
}
