import {
  type AdminStation,
  type AdminStationNeighbor,
  type AdminStationRailway,
  type AdminStationsOverview,
  STATION_RULES,
} from '@kilotrace/shared/admin';
import type { TablePage, TableQuery } from '@kilotrace/shared/table';
import {
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Put,
} from '@nestjs/common';
import { assertRules } from '../../common/field-rules';
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember, Permission } from '../access/permission.decorator';
import { Audited } from '../audit/audited.decorator';
import { TableQueryParam } from '../common/table-query';
import { HideStationDto, RenameStationDto } from './admin-stations.dto';
import { AdminStationsService } from './admin-stations.service';

const STATION = { type: 'station', param: 'id' };

/** The train stations of the dataset: every member reads, `stations.edit` renames and hides. */
@AdminController('stations')
export class AdminStationsController {
  constructor(private readonly stations: AdminStationsService) {}

  @Get('overview')
  @AnyMember()
  overview(): Promise<AdminStationsOverview> {
    return this.stations.overview();
  }

  @Get('table')
  @AnyMember()
  table(
    @TableQueryParam({ id: 'holders', desc: true }) query: TableQuery,
  ): Promise<TablePage<AdminStation>> {
    return this.stations.table(query);
  }

  @Get(':id')
  @AnyMember()
  station(@Param('id', ParseIntPipe) id: number): Promise<AdminStation> {
    return this.stations.station(id);
  }

  @Get(':id/neighbors')
  @AnyMember()
  neighbors(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AdminStationNeighbor[]> {
    return this.stations.neighbors(id);
  }

  @Get(':id/railway')
  @AnyMember()
  railway(@Param('id', ParseIntPipe) id: number): Promise<AdminStationRailway> {
    return this.stations.railway(id);
  }

  @Patch(':id')
  @Permission('stations.edit')
  @Audited({ action: 'stations.rename', target: STATION, details: ['name'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  rename(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenameStationDto,
  ): Promise<void> {
    assertRules(STATION_RULES, dto);
    return this.stations.rename(id, dto.name);
  }

  @Put(':id/hidden')
  @Permission('stations.edit')
  @Audited({ action: 'stations.hide', target: STATION, details: ['hidden'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  setHidden(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HideStationDto,
  ): Promise<void> {
    return this.stations.setHidden(id, dto.hidden);
  }
}
