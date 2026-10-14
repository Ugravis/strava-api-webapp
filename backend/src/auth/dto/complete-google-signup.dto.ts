import { DisplayNameField, UsernameField } from '../../users/dto/user-fields';

export class CompleteGoogleSignupDto {
  @UsernameField()
  username!: string;

  @DisplayNameField()
  displayName!: string;
}
