import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import {
  type CountriesCompletion,
  CountriesService,
  type CountryOutlines,
} from './countries.service';

/**
 * Computed from every tile of the user, including the areas hidden to
 * others: visible to the owner only.
 */
@Controller('countries')
export class CountriesController {
  constructor(private readonly countries: CountriesService) {}

  /** Completion of the countries visited by the user. */
  @Get()
  completion(@CurrentUser() user: User): Promise<CountriesCompletion> {
    return this.countries.completion(user.id);
  }

  /** Simplified outlines of the countries visited by the user, as GeoJSON. */
  @Get('outlines')
  outlines(@CurrentUser() user: User): Promise<CountryOutlines> {
    return this.countries.outlines(user.id);
  }
}
