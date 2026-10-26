import { IsString, Length } from 'class-validator';
import { PasswordField } from '../../users/dto/user-fields';

export class TokenDto {
  @IsString()
  @Length(20, 100)
  token!: string;
}

export class ResetPasswordDto extends TokenDto {
  @PasswordField()
  password!: string;
}
