import {
  ADMIN_COMMIT_BRANCHES,
  type AdminCommit,
  type AdminCommitBranch,
  type AdminCommitsResponse,
  type AdminDevResponse,
} from '@kilotrace/shared/admin';
import { type TablePage, type TableQuery } from '@kilotrace/shared/table';
import { Get, Query } from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember } from '../access/permission.decorator';
import { TableQueryParam } from '../common/table-query';
import { AdminDevService } from './admin-dev.service';
import { AdminGithubService } from './admin-github.service';

class CommitsTableQueryDto {
  @IsOptional()
  @IsIn(ADMIN_COMMIT_BRANCHES)
  branch: AdminCommitBranch = 'main';
}

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

  /** Where production stands against `main`, from GitHub. */
  @Get('commits')
  @AnyMember()
  commits(): Promise<AdminCommitsResponse> {
    return this.github.status();
  }

  /** The commits of a branch for the data table, the latest first. */
  @Get('commits/table')
  @AnyMember()
  commitsTable(
    @TableQueryParam() query: TableQuery,
    @Query() { branch }: CommitsTableQueryDto,
  ): Promise<TablePage<AdminCommit>> {
    return this.github.table(query, branch);
  }
}
