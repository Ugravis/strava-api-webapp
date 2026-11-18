import type {
  AdminRelatedStationReports,
  AdminStationReport,
  AdminStationReportsOverview,
} from '@kilotrace/shared/admin';
import { type TablePage, type TableQuery } from '@kilotrace/shared/table';
import {
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../users/user.entity';
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember, Permission } from '../access/permission.decorator';
import { Audited } from '../audit/audited.decorator';
import { TableQueryParam } from '../common/table-query';
import { RelatedReportsQueryDto } from '../user-reports/admin-user-reports.dto';
import {
  DecideStationReportDto,
  DismissStationReportDto,
} from './admin-station-reports.dto';
import { AdminStationReportsService } from './admin-station-reports.service';

const TARGET = { type: 'report', param: 'id' };

const noteOf = (dto: DecideStationReportDto) => dto.note?.trim() || null;

/** Reports of the railway data: the team reads, members holding `stations.reports` decide. */
@AdminController('station-reports')
export class AdminStationReportsController {
  constructor(private readonly reports: AdminStationReportsService) {}

  @Get('table')
  @AnyMember()
  table(
    @TableQueryParam() query: TableQuery,
  ): Promise<TablePage<AdminStationReport>> {
    return this.reports.table(query);
  }

  @Get('overview')
  @AnyMember()
  overview(): Promise<AdminStationReportsOverview> {
    return this.reports.overview();
  }

  @Get(':id')
  @AnyMember()
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<AdminStationReport> {
    return this.reports.detail(id);
  }

  @Get(':id/related')
  @AnyMember()
  related(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() { offset }: RelatedReportsQueryDto,
  ): Promise<AdminRelatedStationReports> {
    return this.reports.related(id, offset ?? 0);
  }

  @Post(':id/acceptance')
  @Permission('stations.reports')
  @Audited({
    action: 'stationReports.accept',
    target: TARGET,
    details: ['note'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  accept(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideStationReportDto,
  ): Promise<void> {
    return this.reports.accept(actor, id, noteOf(dto));
  }

  @Post(':id/dismissal')
  @Permission('stations.reports')
  @Audited({
    action: 'stationReports.dismiss',
    target: TARGET,
    details: ['dismissal', 'note'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  dismiss(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DismissStationReportDto,
  ): Promise<void> {
    return this.reports.dismiss(actor, id, dto.dismissal, noteOf(dto));
  }

  @Post(':id/completion')
  @Permission('stations.reports')
  @Audited({
    action: 'stationReports.complete',
    target: TARGET,
    details: ['note'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  complete(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideStationReportDto,
  ): Promise<void> {
    return this.reports.complete(actor, id, noteOf(dto));
  }
}
