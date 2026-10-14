import { IsString, MaxLength } from 'class-validator';
import { NormalizeIdentifier } from '../../common/transformers';

export class UsernameAvailabilityQueryDto {
  @NormalizeIdentifier()
  @IsString()
  @MaxLength(50)
  username!: string;
}
