import {
  AdminRole,
  type AdminCommitsResponse,
  type AdminDevResponse,
} from '@kilotrace/shared/admin';
import { Get } from '@nestjs/common';
import { AdminController } from '../access/admin-controller.decorator';
import { Roles } from '../access/roles.decorator';
import { AdminDevService } from './admin-dev.service';
import { AdminGithubService } from './admin-github.service';

@AdminController('dev')
export class AdminDevController {
  constructor(
    private readonly dev: AdminDevService,
    private readonly github: AdminGithubService,
  ) {}

  /** Versions, commit and migrations, read-only, hence open to the support. */
  @Get()
  @Roles(AdminRole.Support)
  get(): Promise<AdminDevResponse> {
    return this.dev.overview();
  }

  /** Latest commits of `main`, apart since GitHub may be slow or down. */
  @Get('commits')
  @Roles(AdminRole.Support)
  commits(): Promise<AdminCommitsResponse> {
    return this.github.commits();
  }
}
