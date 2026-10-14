import { IsEmail, IsString, MaxLength } from 'class-validator';
import { NormalizeIdentifier } from '../../common/transformers';
import { PASSWORD_MAX_LENGTH } from '../../users/dto/validation.constants';

export class LoginDto {
  @NormalizeIdentifier()
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
