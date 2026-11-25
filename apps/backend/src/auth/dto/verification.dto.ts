import { IsUUID, Matches } from 'class-validator';
import { VERIFICATION_CODE_PATTERN } from '@kilotrace/shared';

export class ChallengeDto {
  @IsUUID()
  challengeId!: string;
}

export class VerifyCodeDto extends ChallengeDto {
  @Matches(VERIFICATION_CODE_PATTERN, { message: 'code must be 6 digits' })
  code!: string;
}
