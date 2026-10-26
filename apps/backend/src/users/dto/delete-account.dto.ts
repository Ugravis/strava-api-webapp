import { IsOptional, IsString, MaxLength } from 'class-validator';
import { NormalizeIdentifier } from '../../common/transformers';
import { PASSWORD_MAX_LENGTH } from './validation.constants';

/** Accounts with a password confirm with it, OAuth-only accounts with their username. */
export class DeleteAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password?: string;

  @IsOptional()
  @NormalizeIdentifier()
  @IsString()
  @MaxLength(50)
  usernameConfirmation?: string;
}
