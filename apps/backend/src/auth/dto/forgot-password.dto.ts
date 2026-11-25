import { EmailField } from '../../users/dto/user-fields';

export class ForgotPasswordDto {
  @EmailField()
  email!: string;
}
