import type { AdminUserTag } from '@kilotrace/shared/admin';
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
import { ReorderDto } from '../badges/admin-badges.dto';
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

  @Post()
  @Permission('userTags.create')
  @Audited({ action: 'userTags.create', details: ['id', 'name'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  create(@Body() dto: CreateUserTagDto): Promise<void> {
    return this.userTags.create(dto);
  }

  /** Declared before `:id`, which would take `order` for an id. */
  @Put('order')
  @Permission('userTags.edit')
  @Audited({ action: 'userTags.reorder' })
  @HttpCode(HttpStatus.NO_CONTENT)
  reorder(@Body() dto: ReorderDto): Promise<void> {
    return this.userTags.reorder(dto.ids);
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
    return this.userTags.update(id, dto);
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
