import { AdminRole, type AdminReservedUsername } from '@kilotrace/shared/admin';
import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../users/user.entity';
import { AdminController } from '../access/admin-controller.decorator';
import { Roles } from '../access/roles.decorator';
import { Audited } from '../audit/audited.decorator';
import { ReserveUsernameDto } from './admin-reserved-usernames.dto';
import { AdminReservedUsernamesService } from './admin-reserved-usernames.service';

/** Usernames kept out of the sign-ups: support reads, admins act. */
@AdminController('reserved-usernames')
export class AdminReservedUsernamesController {
  constructor(private readonly reserved: AdminReservedUsernamesService) {}

  @Get()
  @Roles(AdminRole.Support)
  list(): Promise<AdminReservedUsername[]> {
    return this.reserved.list();
  }

  @Post()
  @Roles(AdminRole.Admin)
  @Audited({ action: 'usernames.reserve', details: ['username', 'category'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  reserve(
    @CurrentUser() actor: User,
    @Body() dto: ReserveUsernameDto,
  ): Promise<void> {
    return this.reserved.reserve(actor, dto);
  }

  @Delete(':username')
  @Roles(AdminRole.Admin)
  @Audited({ action: 'usernames.release', details: ['username'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  release(@Param('username') username: string): Promise<void> {
    return this.reserved.release(username);
  }
}
