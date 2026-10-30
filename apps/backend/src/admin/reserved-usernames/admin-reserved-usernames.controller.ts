import { type AdminReservedUsername } from '@kilotrace/shared/admin';
import { type TablePage, type TableQuery } from '@kilotrace/shared/table';
import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../users/user.entity';
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember, Permission } from '../access/permission.decorator';
import { Audited } from '../audit/audited.decorator';
import { TableQueryParam } from '../common/table-query';
import {
  ReserveUsernameDto,
  UpdateReservedUsernameDto,
} from './admin-reserved-usernames.dto';
import { AdminReservedUsernamesService } from './admin-reserved-usernames.service';

/** Usernames kept out of the sign-ups: support reads, admins act. */
@AdminController('reserved-usernames')
export class AdminReservedUsernamesController {
  constructor(private readonly reserved: AdminReservedUsernamesService) {}

  @Get('table')
  @AnyMember()
  table(
    @TableQueryParam() query: TableQuery,
  ): Promise<TablePage<AdminReservedUsername>> {
    return this.reserved.table(query);
  }

  @Post()
  @Permission('usernames.manage')
  @Audited({ action: 'usernames.reserve', details: ['username', 'category'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  reserve(
    @CurrentUser() actor: User,
    @Body() dto: ReserveUsernameDto,
  ): Promise<void> {
    return this.reserved.reserve(actor, dto);
  }

  @Patch(':username')
  @Permission('usernames.manage')
  @Audited({ action: 'usernames.update', details: ['category'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @Param('username') username: string,
    @Body() dto: UpdateReservedUsernameDto,
  ): Promise<void> {
    return this.reserved.update(username, dto);
  }

  @Delete(':username')
  @Permission('usernames.manage')
  @Audited({ action: 'usernames.release', details: ['username'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  release(@Param('username') username: string): Promise<void> {
    return this.reserved.release(username);
  }
}
