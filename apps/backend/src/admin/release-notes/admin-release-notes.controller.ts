import {
  type AdminReleaseNote,
  type AdminReleaseNotesOverview,
  RELEASE_NOTE_RULES,
} from '@kilotrace/shared/admin';
import type { TablePage, TableQuery } from '@kilotrace/shared/table';
import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { assertRules } from '../../common/field-rules';
import type { User } from '../../users/user.entity';
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember, Permission } from '../access/permission.decorator';
import { Audited } from '../audit/audited.decorator';
import { TableQueryParam } from '../common/table-query';
import {
  CreateReleaseNoteDto,
  SetReleaseNoteStatusDto,
  UpdateReleaseNoteDto,
} from './admin-release-notes.dto';
import { AdminReleaseNotesService } from './admin-release-notes.service';

const RELEASE_NOTE = { type: 'releaseNote', param: 'version' };

/** The fields sent, without those the DTO declares and the body left out. */
const sent = <T extends object>(dto: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(dto).filter(([, value]) => value !== undefined),
  ) as Partial<T>;

/** The releases of the site and their notes: every member reads, the permissions act. */
@AdminController('release-notes')
export class AdminReleaseNotesController {
  constructor(private readonly releaseNotes: AdminReleaseNotesService) {}

  @Get('table')
  @AnyMember()
  table(
    @TableQueryParam({ id: 'version', desc: true }) query: TableQuery,
  ): Promise<TablePage<AdminReleaseNote>> {
    return this.releaseNotes.table(query);
  }

  @Get('overview')
  @AnyMember()
  overview(): Promise<AdminReleaseNotesOverview> {
    return this.releaseNotes.overview();
  }

  @Post()
  @Permission('releaseNotes.create')
  @Audited({ action: 'releaseNotes.create', details: ['version', 'title'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  create(
    @CurrentUser() actor: User,
    @Body() dto: CreateReleaseNoteDto,
  ): Promise<void> {
    assertRules(RELEASE_NOTE_RULES, sent(dto), { partial: true });
    return this.releaseNotes.create(dto, actor);
  }

  @Patch(':version')
  @Permission('releaseNotes.edit')
  @Audited({
    action: 'releaseNotes.update',
    target: RELEASE_NOTE,
    details: ['display'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @CurrentUser() actor: User,
    @Param('version') version: string,
    @Body() dto: UpdateReleaseNoteDto,
  ): Promise<void> {
    assertRules(RELEASE_NOTE_RULES, sent(dto), { partial: true });
    return this.releaseNotes.update(version, dto, actor);
  }

  @Put(':version/status')
  @Permission('releaseNotes.publish')
  @Audited({
    action: 'releaseNotes.status',
    target: RELEASE_NOTE,
    details: ['status'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  setStatus(
    @CurrentUser() actor: User,
    @Param('version') version: string,
    @Body() { status }: SetReleaseNoteStatusDto,
  ): Promise<void> {
    return this.releaseNotes.setStatus(version, status, actor);
  }

  @Delete(':version')
  @Permission('releaseNotes.delete')
  @Audited({
    action: 'releaseNotes.delete',
    target: RELEASE_NOTE,
    destructive: true,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('version') version: string): Promise<void> {
    return this.releaseNotes.delete(version);
  }
}
