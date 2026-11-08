import { AcceptTermsField, UsernameField } from '../../users/dto/user-fields';

export class CompleteGoogleSignupDto {
  @UsernameField()
  username!: string;

  @AcceptTermsField()
  acceptTerms!: boolean;
}
