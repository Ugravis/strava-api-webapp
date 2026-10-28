import {
  type AdminCommitsResponse,
  type AdminDevResponse,
} from '@kilotrace/shared/admin';
import { Get, Query } from '@nestjs/common';
import { AdminController } from '../access/admin-controller.decorator';
import { Permission } from '../access/permission.decorator';
import { AdminPageQueryDto } from '../common/admin-page-query.dto';
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
  @Permission('dev.view')
  get(): Promise<AdminDevResponse> {
    return this.dev.overview();
  }

  /** Commits of `main` from GitHub, by pages, the latest first. */
  @Get('commits')
  @Permission('dev.view')
  commits(@Query() query: AdminPageQueryDto): Promise<AdminCommitsResponse> {
    return this.github.commits(query.page);
  }
}
