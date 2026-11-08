import type {
  AdminRelatedUserReports,
  AdminUserReport,
  AdminUserReportsOverview,
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
import { ReasonDto } from '../users/admin-users.dto';
import {
  RelatedReportsQueryDto,
  SanctionUserReportDto,
} from './admin-user-reports.dto';
import { AdminUserReportsService } from './admin-user-reports.service';

const TARGET = { type: 'report', param: 'id' };

/** Reports of a user by another one: the team reads, members holding the permission decide. */
@AdminController('user-reports')
export class AdminUserReportsController {
  constructor(private readonly reports: AdminUserReportsService) {}

  @Get('table')
  @AnyMember()
  table(
    @TableQueryParam() query: TableQuery,
  ): Promise<TablePage<AdminUserReport>> {
    return this.reports.table(query);
  }

  @Get('overview')
  @AnyMember()
  overview(): Promise<AdminUserReportsOverview> {
    return this.reports.overview();
  }

  @Get(':id')
  @AnyMember()
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<AdminUserReport> {
    return this.reports.detail(id);
  }

  @Get(':id/related')
  @AnyMember()
  related(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() { offset }: RelatedReportsQueryDto,
  ): Promise<AdminRelatedUserReports> {
    return this.reports.related(id, offset ?? 0);
  }

  @Post(':id/sanction')
  @Permission('reports.handle')
  @Audited({
    action: 'reports.sanction',
    target: TARGET,
    destructive: true,
    details: ['sanction', 'fields', 'until'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  sanction(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SanctionUserReportDto,
  ): Promise<void> {
    return this.reports.sanction(actor, id, dto);
  }

  @Post(':id/dismissal')
  @Permission('reports.handle')
  @Audited({ action: 'reports.dismiss', target: TARGET, destructive: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  dismiss(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ): Promise<void> {
    return this.reports.dismiss(actor, id, dto.reason!.trim());
  }
}
