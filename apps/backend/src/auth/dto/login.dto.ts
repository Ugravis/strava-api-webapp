import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { EMAIL_MAX_LENGTH } from '@kilotrace/shared';
import { NormalizeIdentifier } from '../../common/transformers';
import { CurrentPasswordField } from '../../users/dto/user-fields';

export class LoginDto {
  /** Email or username: an `@` tells them apart. */
  @NormalizeIdentifier()
  @IsString()
  @Length(1, EMAIL_MAX_LENGTH)
  identifier!: string;

  @CurrentPasswordField()
  password!: string;

  /** "Stay signed in": persistent cookie and long-lived session. */
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
