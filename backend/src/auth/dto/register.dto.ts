import { IsEmail, MaxLength } from 'class-validator';
import { NormalizeIdentifier } from '../../common/transformers';
import {
  AcceptTermsField,
  PasswordField,
  UsernameField,
} from '../../users/dto/user-fields';

/** The display name is not asked at sign-up: it can be set later from the profile. */
export class RegisterDto {
  @NormalizeIdentifier()
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @PasswordField()
  password!: string;

  @UsernameField()
  username!: string;

  @AcceptTermsField()
  acceptTerms!: boolean;
}
