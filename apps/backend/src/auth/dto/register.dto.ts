import {
  AcceptTermsField,
  EmailField,
  PasswordField,
  UsernameField,
} from '../../users/dto/user-fields';

/** The display name is not asked at sign-up: it can be set later from the profile. */
export class RegisterDto {
  @EmailField()
  email!: string;

  @PasswordField()
  password!: string;

  @UsernameField()
  username!: string;

  @AcceptTermsField()
  acceptTerms!: boolean;
}
