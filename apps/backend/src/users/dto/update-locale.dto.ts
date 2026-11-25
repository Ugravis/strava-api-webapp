import { type Locale, LOCALES } from '@kilotrace/shared';
import { IsIn } from 'class-validator';

export class UpdateLocaleDto {
  @IsIn(LOCALES)
  locale!: Locale;
}
