import { AdminRole, type AdminDevResponse } from '@kilotrace/shared/admin';
import { Get } from '@nestjs/common';
import { AdminController } from '../access/admin-controller.decorator';
import { Roles } from '../access/roles.decorator';
import { AdminDevService } from './admin-dev.service';

@AdminController('dev')
export class AdminDevController {
  constructor(private readonly dev: AdminDevService) {}

  /** Versions, commit and migrations, read-only, hence open to the support. */
  @Get()
  @Roles(AdminRole.Support)
  get(): Promise<AdminDevResponse> {
    return this.dev.overview();
  }
}
