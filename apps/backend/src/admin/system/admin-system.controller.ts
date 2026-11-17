import type {
  AdminAppSettingsResponse,
  SystemStatusResponse,
} from '@kilotrace/shared';
import type {
  AdminDatabaseTable,
  AdminUploadsAudit,
} from '@kilotrace/shared/admin';
import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
import { AppSettingsService } from '../../system/app-settings.service';
import { SystemSettingsService } from '../../system/system-settings.service';
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember, Permission } from '../access/permission.decorator';
import { Audited } from '../audit/audited.decorator';
import { SetAppSettingDto, SetMaintenanceDto } from './admin-system.dto';
import { AdminDatabaseService } from './admin-database.service';
import { AdminUploadsService } from './admin-uploads.service';

/** Maintenance banner, settings and storage of the site: every member reads, each action behind its permission. */
@AdminController('system')
export class AdminSystemController {
  constructor(
    private readonly settings: SystemSettingsService,
    private readonly appSettings: AppSettingsService,
    private readonly uploads: AdminUploadsService,
    private readonly database: AdminDatabaseService,
  ) {}

  @Get()
  @AnyMember()
  status(): Promise<SystemStatusResponse> {
    return this.settings.status();
  }

  @Put('maintenance')
  @Permission('system.maintenance')
  @Audited({
    action: 'system.maintenance.set',
    details: ['title', 'description'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  setMaintenance(@Body() dto: SetMaintenanceDto): Promise<void> {
    return this.settings.setMaintenance(dto.title, dto.description);
  }

  @Delete('maintenance')
  @Permission('system.maintenance')
  @Audited({ action: 'system.maintenance.clear' })
  @HttpCode(HttpStatus.NO_CONTENT)
  clearMaintenance(): Promise<void> {
    return this.settings.clearMaintenance();
  }

  @Get('settings')
  @AnyMember()
  appSettingsList(): Promise<AdminAppSettingsResponse> {
    return this.appSettings.list();
  }

  @Put('settings/:key')
  @Permission('system.settings')
  @Audited({ action: 'system.settings.set', details: ['key', 'value'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  setAppSetting(
    @Param('key') key: string,
    @Body() dto: SetAppSettingDto,
  ): Promise<void> {
    return this.appSettings.set(key, dto.value);
  }

  @Delete('settings/:key')
  @Permission('system.settings')
  @Audited({ action: 'system.settings.reset', details: ['key'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  resetAppSetting(@Param('key') key: string): Promise<void> {
    return this.appSettings.reset(key);
  }

  /** The tables of the database and their figures, read only. */
  @Get('database')
  @AnyMember()
  databaseTables(): Promise<AdminDatabaseTable[]> {
    return this.database.tables();
  }

  @Get('uploads')
  @AnyMember()
  uploadsAudit(): Promise<AdminUploadsAudit> {
    return this.uploads.audit();
  }

  @Delete('uploads/orphans')
  @Permission('system.uploads')
  @Audited({ action: 'system.uploads.orphans.delete', destructive: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteOrphans(): Promise<void> {
    return this.uploads.deleteOrphans();
  }
}
