import type { SystemStatusResponse } from '@kilotrace/shared';
import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SystemSettingsService } from './system-settings.service';

@Controller('system')
export class SystemController {
  constructor(private readonly settings: SystemSettingsService) {}

  /** The maintenance banner and whether accounts can be created. */
  @Public()
  @Get('status')
  status(): Promise<SystemStatusResponse> {
    return this.settings.status();
  }
}
