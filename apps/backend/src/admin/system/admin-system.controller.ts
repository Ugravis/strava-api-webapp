import type { SystemStatusResponse } from '@kilotrace/shared';
import { AdminRole, type AdminUploadsAudit } from '@kilotrace/shared/admin';
import { Body, Delete, Get, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { SystemSettingsService } from '../../system/system-settings.service';
import { AdminController } from '../access/admin-controller.decorator';
import { Roles } from '../access/roles.decorator';
import { Audited } from '../audit/audited.decorator';
import { SetMaintenanceDto, SetSignupsDto } from './admin-system.dto';
import { AdminUploadsService } from './admin-uploads.service';

/** Switches of the whole site: support reads, super-admins act. */
@AdminController('system')
export class AdminSystemController {
  constructor(
    private readonly settings: SystemSettingsService,
    private readonly uploads: AdminUploadsService,
  ) {}

  @Get()
  @Roles(AdminRole.Support)
  status(): Promise<SystemStatusResponse> {
    return this.settings.status();
  }

  @Put('maintenance')
  @Roles(AdminRole.SuperAdmin)
  @Audited({
    action: 'system.maintenance.set',
    details: ['title', 'description'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  setMaintenance(@Body() dto: SetMaintenanceDto): Promise<void> {
    return this.settings.setMaintenance(dto.title, dto.description);
  }

  @Delete('maintenance')
  @Roles(AdminRole.SuperAdmin)
  @Audited({ action: 'system.maintenance.clear' })
  @HttpCode(HttpStatus.NO_CONTENT)
  clearMaintenance(): Promise<void> {
    return this.settings.clearMaintenance();
  }

  @Put('signups')
  @Roles(AdminRole.SuperAdmin)
  @Audited({ action: 'system.signups', details: ['enabled'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  setSignups(@Body() dto: SetSignupsDto): Promise<void> {
    return this.settings.setSignupsEnabled(dto.enabled);
  }

  @Get('uploads')
  @Roles(AdminRole.Support)
  uploadsAudit(): Promise<AdminUploadsAudit> {
    return this.uploads.audit();
  }

  @Delete('uploads/orphans')
  @Roles(AdminRole.SuperAdmin)
  @Audited({ action: 'system.uploads.orphans.delete', destructive: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteOrphans(): Promise<void> {
    return this.uploads.deleteOrphans();
  }
}
