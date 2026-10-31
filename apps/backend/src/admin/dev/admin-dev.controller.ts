import {
  type AdminCommit,
  type AdminCommitsResponse,
  type AdminDevResponse,
} from '@kilotrace/shared/admin';
import { type TablePage, type TableQuery } from '@kilotrace/shared/table';
import { Get, Query } from '@nestjs/common';
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember } from '../access/permission.decorator';
import { AdminPageQueryDto } from '../common/admin-page-query.dto';
import { TableQueryParam } from '../common/table-query';
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
  @AnyMember()
  get(): Promise<AdminDevResponse> {
    return this.dev.overview();
  }

  /** Commits of `main` from GitHub, by pages, the latest first. */
  @Get('commits')
  @AnyMember()
  commits(@Query() query: AdminPageQueryDto): Promise<AdminCommitsResponse> {
    return this.github.commits(query.page);
  }

  /** The same commits for the data table, by pages only. */
  @Get('commits/table')
  @AnyMember()
  commitsTable(
    @TableQueryParam() query: TableQuery,
  ): Promise<TablePage<AdminCommit>> {
    return this.github.table(query);
  }
}
