import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';
import { CountriesWorker } from './countries.worker';
import { CountryPart } from './country-part.entity';
import { Country } from './country.entity';
import { LocatedTile } from './located-tile.entity';
import { TileCountry } from './tile-country.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Country, CountryPart, TileCountry, LocatedTile]),
  ],
  controllers: [CountriesController],
  providers: [CountriesService, CountriesWorker],
})
export class CountriesModule {}
