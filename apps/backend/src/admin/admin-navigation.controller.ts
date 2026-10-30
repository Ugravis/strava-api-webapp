import type { AdminNavigationCounts } from '@kilotrace/shared/admin';
import { Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge } from '../distances/badge.entity';
import { ReservedUsername } from '../users/reserved-username.entity';
import { UserTag } from '../users/user-tag.entity';
import { User } from '../users/user.entity';
import { AdminController } from './access/admin-controller.decorator';
import { AnyMember } from './access/permission.decorator';

@AdminController('navigation')
export class AdminNavigationController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Badge) private readonly badges: Repository<Badge>,
    @InjectRepository(UserTag) private readonly userTags: Repository<UserTag>,
    @InjectRepository(ReservedUsername)
    private readonly reservedUsernames: Repository<ReservedUsername>,
  ) {}

  /** Sizes of the catalogs listed in the sidebar, read on every page of the back office. */
  @Get('counts')
  @AnyMember()
  async counts(): Promise<AdminNavigationCounts> {
    const [users, badges, userTags, reservedUsernames] = await Promise.all([
      this.users.count(),
      this.badges.count(),
      this.userTags.count(),
      this.reservedUsernames.count(),
    ]);
    return { users, badges, userTags, reservedUsernames };
  }
}
