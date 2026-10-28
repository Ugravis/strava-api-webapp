import { AdminRole, type AdminBadgeCatalog } from '@kilotrace/shared/admin';
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
import { Roles } from '../access/roles.decorator';
import { Audited } from '../audit/audited.decorator';
import {
  CreateBadgeDto,
  CreateBadgeThemeDto,
  ReorderDto,
  SetBadgeActiveDto,
  UpdateBadgeDto,
  UpdateBadgeThemeDto,
} from './admin-badges.dto';
import { AdminBadgesService } from './admin-badges.service';

const BADGE = { type: 'badge', param: 'id' };
const THEME = { type: 'badge_theme', param: 'id' };

/** The catalog of badges: support reads, admins edit. */
@AdminController('badges')
export class AdminBadgesController {
  constructor(private readonly badges: AdminBadgesService) {}

  @Get()
  @Roles(AdminRole.Support)
  catalog(): Promise<AdminBadgeCatalog> {
    return this.badges.catalog();
  }

  @Post()
  @Roles(AdminRole.Admin)
  @Audited({ action: 'badges.create', details: ['id', 'name'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  create(@Body() dto: CreateBadgeDto): Promise<void> {
    return this.badges.createBadge(dto);
  }

  /** Declared before `:id`, which would take `order` for an id. */
  @Put('order')
  @Roles(AdminRole.Admin)
  @Audited({ action: 'badges.reorder' })
  @HttpCode(HttpStatus.NO_CONTENT)
  reorder(@Body() dto: ReorderDto): Promise<void> {
    return this.badges.reorderBadges(dto.ids);
  }

  @Patch(':id')
  @Roles(AdminRole.Admin)
  @Audited({ action: 'badges.update', target: BADGE, details: ['name'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  update(@Param('id') id: string, @Body() dto: UpdateBadgeDto): Promise<void> {
    return this.badges.updateBadge(id, dto);
  }

  @Put(':id/active')
  @Roles(AdminRole.Admin)
  @Audited({ action: 'badges.active', target: BADGE, details: ['active'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  setActive(
    @Param('id') id: string,
    @Body() dto: SetBadgeActiveDto,
  ): Promise<void> {
    return this.badges.setBadgeActive(id, dto.active);
  }

  @Delete(':id')
  @Roles(AdminRole.Admin)
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

  @Post()
  @Roles(AdminRole.Admin)
  @Audited({ action: 'badges.themes.create', details: ['id', 'name'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  create(@Body() dto: CreateBadgeThemeDto): Promise<void> {
    return this.badges.createTheme(dto);
  }

  @Put('order')
  @Roles(AdminRole.Admin)
  @Audited({ action: 'badges.themes.reorder' })
  @HttpCode(HttpStatus.NO_CONTENT)
  reorder(@Body() dto: ReorderDto): Promise<void> {
    return this.badges.reorderThemes(dto.ids);
  }

  @Patch(':id')
  @Roles(AdminRole.Admin)
  @Audited({ action: 'badges.themes.update', target: THEME, details: ['name'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBadgeThemeDto,
  ): Promise<void> {
    return this.badges.updateTheme(id, dto);
  }

  @Delete(':id')
  @Roles(AdminRole.Admin)
  @Audited({ action: 'badges.themes.delete', target: THEME, destructive: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.badges.deleteTheme(id);
  }
}
