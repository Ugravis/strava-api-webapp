import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Place } from './place.entity';
import { RailLinkCountry } from './rail-link-country.entity';
import { RailLink } from './rail-link.entity';
import { RailwayImport } from './railway-import.entity';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Place, RailLink, RailLinkCountry, RailwayImport]),
  ],
  controllers: [StationsController],
  providers: [StationsService],
  exports: [StationsService],
})
export class StationsModule {}
