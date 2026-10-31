import type {
  AdminBadge,
  AdminBadgeCatalog,
  AdminBadgeThemeRow,
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
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember, Permission } from '../access/permission.decorator';
import { Audited } from '../audit/audited.decorator';
import { TableMoveDto } from '../common/table-move';
import { TableQueryParam } from '../common/table-query';
import {
  CreateBadgeDto,
  CreateBadgeThemeDto,
  SetBadgeActiveDto,
  UpdateBadgeDto,
  UpdateBadgeThemeDto,
} from './admin-badges.dto';
import { AdminBadgesService } from './admin-badges.service';

const BADGE = { type: 'badge', param: 'id' };
const THEME = { type: 'badge_theme', param: 'id' };
const BY_POSITION = { id: 'position', desc: false };

/** The catalog of badges: support reads, admins edit. */
@AdminController('badges')
export class AdminBadgesController {
  constructor(private readonly badges: AdminBadgesService) {}

  @Get()
  @AnyMember()
  catalog(): Promise<AdminBadgeCatalog> {
    return this.badges.catalog();
  }

  @Get('table')
  @AnyMember()
  table(
    @TableQueryParam(BY_POSITION) query: TableQuery,
  ): Promise<TablePage<AdminBadge>> {
    return this.badges.table(query);
  }

  /** Declared before `:id`, which would take `move` for an id. */
  @Put('move')
  @Permission('badges.edit')
  @Audited({ action: 'badges.reorder', details: ['id'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  move(@Body() dto: TableMoveDto): Promise<void> {
    return this.badges.moveBadge(dto);
  }

  @Post()
  @Permission('badges.create')
  @Audited({ action: 'badges.create', details: ['id', 'name'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  create(@Body() dto: CreateBadgeDto): Promise<void> {
    return this.badges.createBadge(dto);
  }

  @Patch(':id')
  @Permission('badges.edit')
  @Audited({ action: 'badges.update', target: BADGE, details: ['name'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  update(@Param('id') id: string, @Body() dto: UpdateBadgeDto): Promise<void> {
    return this.badges.updateBadge(id, dto);
  }

  @Put(':id/active')
  @Permission('badges.edit')
  @Audited({ action: 'badges.active', target: BADGE, details: ['active'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  setActive(
    @Param('id') id: string,
    @Body() dto: SetBadgeActiveDto,
  ): Promise<void> {
    return this.badges.setBadgeActive(id, dto.active);
  }

  @Delete(':id')
  @Permission('badges.delete')
  @Audited({ action: 'badges.delete', target: BADGE, destructive: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.badges.deleteBadge(id);
  }
}

/** The collections gathering badges, e.g. astronomy. */
@AdminController('badge-themes')
export class AdminBadgeThemesController {
  constructor(private readonly badges: AdminBadgesService) {}

  @Get('table')
  @AnyMember()
  table(
    @TableQueryParam(BY_POSITION) query: TableQuery,
  ): Promise<TablePage<AdminBadgeThemeRow>> {
    return this.badges.themesTable(query);
  }

  @Put('move')
  @Permission('badges.edit')
  @Audited({ action: 'badges.themes.reorder', details: ['id'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  move(@Body() dto: TableMoveDto): Promise<void> {
    return this.badges.moveTheme(dto);
  }

  @Post()
  @Permission('badges.create')
  @Audited({ action: 'badges.themes.create', details: ['id', 'name'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  create(@Body() dto: CreateBadgeThemeDto): Promise<void> {
    return this.badges.createTheme(dto);
  }

  @Patch(':id')
  @Permission('badges.edit')
  @Audited({ action: 'badges.themes.update', target: THEME, details: ['name'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBadgeThemeDto,
  ): Promise<void> {
    return this.badges.updateTheme(id, dto);
  }

  @Delete(':id')
  @Permission('badges.delete')
  @Audited({ action: 'badges.themes.delete', target: THEME, destructive: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.badges.deleteTheme(id);
  }
}
