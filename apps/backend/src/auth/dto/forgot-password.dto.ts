import { IsEmail, MaxLength } from 'class-validator';
import { NormalizeIdentifier } from '../../common/transformers';

export class ForgotPasswordDto {
  @NormalizeIdentifier()
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
