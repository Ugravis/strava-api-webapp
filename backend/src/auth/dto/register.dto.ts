import { IsEmail, MaxLength } from 'class-validator';
import { NormalizeIdentifier } from '../../common/transformers';
import {
  DisplayNameField,
  PasswordField,
  UsernameField,
} from '../../users/dto/user-fields';

export class RegisterDto {
  @NormalizeIdentifier()
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @PasswordField()
  password!: string;

  @UsernameField()
  username!: string;

  @DisplayNameField()
  displayName!: string;
}
