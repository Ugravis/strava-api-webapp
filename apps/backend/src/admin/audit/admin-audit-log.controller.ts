import { type AdminPage, type AuditLogEntry } from '@kilotrace/shared/admin';
import { type TablePage, type TableQuery } from '@kilotrace/shared/table';
import {
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../users/user.entity';
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember, Permission } from '../access/permission.decorator';
import { TableQueryParam } from '../common/table-query';
import { AdminPermissionsService } from '../permissions/admin-permissions.service';
import { AdminAuditLogService } from './admin-audit-log.service';
import { AuditLogQueryDto, AuditTableScopeDto } from './audit-log-query.dto';
import { NotAudited } from './audited.decorator';

@AdminController('audit-log')
export class AdminAuditLogController {
  constructor(
    private readonly audit: AdminAuditLogService,
    private readonly permissions: AdminPermissionsService,
  ) {}

  @Get()
  @AnyMember()
  async page(
    @CurrentUser() user: User,
    @Query() query: AuditLogQueryDto,
  ): Promise<AdminPage<AuditLogEntry>> {
    return this.audit.page(
      query,
      await this.permissions.can(user.roles, 'audit.hide'),
    );
  }

  @Get('table')
  @AnyMember()
  async table(
    @CurrentUser() user: User,
    @TableQueryParam() query: TableQuery,
    @Query() scope: AuditTableScopeDto,
  ): Promise<TablePage<AuditLogEntry>> {
    return this.audit.table(
      query,
      scope,
      await this.permissions.can(user.roles, 'audit.hide'),
    );
  }

  /** Masking leaves no entry: recorded, it would show what it hides. */
  @Put(':id/hidden')
  @Permission('audit.hide')
  @NotAudited()
  @HttpCode(HttpStatus.NO_CONTENT)
  hide(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.audit.setHidden(id, user.id);
  }

  @Delete(':id/hidden')
  @Permission('audit.hide')
  @NotAudited()
  @HttpCode(HttpStatus.NO_CONTENT)
  show(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.audit.setHidden(id, null);
  }
}
