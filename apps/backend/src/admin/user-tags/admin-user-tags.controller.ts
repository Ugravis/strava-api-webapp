import type { FillTranslationsResponse } from '@kilotrace/shared';
import { type AdminUserTag, USER_TAG_RULES } from '@kilotrace/shared/admin';
import { UpdateTranslationDto } from '../../common/translations';
import { assertRules } from '../../common/field-rules';
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
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember, Permission } from '../access/permission.decorator';
import { Audited } from '../audit/audited.decorator';
import { TableMoveDto } from '../common/table-move';
import { TableQueryParam } from '../common/table-query';
import { CreateUserTagDto, UpdateUserTagDto } from './admin-user-tags.dto';
import { AdminUserTagsService } from './admin-user-tags.service';

const USER_TAG = { type: 'userTag', param: 'id' };

/** The user tags, badges owed to the membership: every member reads, the permissions act. */
@AdminController('user-tags')
export class AdminUserTagsController {
  constructor(private readonly userTags: AdminUserTagsService) {}

  @Get()
  @AnyMember()
  catalog(): Promise<AdminUserTag[]> {
    return this.userTags.catalog();
  }

  @Get('table')
  @AnyMember()
  table(
    @TableQueryParam({ id: 'position', desc: false }) query: TableQuery,
  ): Promise<TablePage<AdminUserTag>> {
    return this.userTags.table(query);
  }

  @Post()
  @Permission('userTags.create')
  @Audited({ action: 'userTags.create', details: ['id', 'name'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  create(@Body() dto: CreateUserTagDto): Promise<void> {
    assertRules(USER_TAG_RULES, dto);
    return this.userTags.create(dto);
  }

  /** Declared before `:id`, which would take `move` for an id. */
  @Put('move')
  @Permission('userTags.edit')
  @Audited({ action: 'userTags.reorder', details: ['id'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  move(@Body() dto: TableMoveDto): Promise<void> {
    return this.userTags.move(dto);
  }

  @Patch(':id')
  @Permission('userTags.edit')
  @Audited({
    action: 'userTags.update',
    target: USER_TAG,
    details: ['name'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserTagDto,
  ): Promise<void> {
    assertRules(USER_TAG_RULES, dto, { partial: true });
    return this.userTags.update(id, dto);
  }

  @Put(':id/translations')
  @Permission('userTags.edit')
  @Audited({
    action: 'userTags.translate',
    target: USER_TAG,
    details: ['locale', 'field'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  translate(
    @Param('id') id: string,
    @Body() dto: UpdateTranslationDto,
  ): Promise<void> {
    return this.userTags.translate(id, dto);
  }

  @Post(':id/translations/fill')
  @Permission('userTags.edit')
  @Audited({ action: 'userTags.translate', target: USER_TAG })
  @HttpCode(HttpStatus.OK)
  fillTranslations(@Param('id') id: string): Promise<FillTranslationsResponse> {
    return this.userTags.fillTranslations(id);
  }

  @Delete(':id')
  @Permission('userTags.delete')
  @Audited({
    action: 'userTags.delete',
    target: USER_TAG,
    destructive: true,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.userTags.delete(id);
  }
}
