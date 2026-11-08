import { IsString, MaxLength } from 'class-validator';

/** `POST /api/admin/auth/google/callback`, sent by the admin app. */
export class AdminGoogleCallbackDto {
  @IsString()
  @MaxLength(2048)
  code!: string;

  @IsString()
  @MaxLength(256)
  state!: string;

  @IsString()
  @MaxLength(4096)
  signedState!: string;
}
