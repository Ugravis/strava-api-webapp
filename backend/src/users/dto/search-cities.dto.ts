import { IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../../common/transformers';
import { CITY_MAX_LENGTH } from './validation.constants';

export class SearchCitiesQueryDto {
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(CITY_MAX_LENGTH)
  q!: string;
}
