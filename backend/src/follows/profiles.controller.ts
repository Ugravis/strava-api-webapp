import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import {
  FollowsPageQueryDto,
  SearchProfilesQueryDto,
  UsernameParamsDto,
} from './follows.dto';
import {
  FollowsService,
  type ProfileSummary,
  type PublicProfile,
} from './follows.service';

/** Public profiles of the users, and who follows whom. */
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly follows: FollowsService) {}

  @Get()
  search(
    @CurrentUser() user: User,
    @Query() { q }: SearchProfilesQueryDto,
  ): Promise<ProfileSummary[]> {
    return this.follows.search(user, q);
  }

  @Get(':username')
  profile(
    @CurrentUser() user: User,
    @Param() { username }: UsernameParamsDto,
  ): Promise<PublicProfile> {
    return this.follows.profile(user, username);
  }

  @Put(':username/follow')
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  follow(
    @CurrentUser() user: User,
    @Param() { username }: UsernameParamsDto,
  ): Promise<void> {
    return this.follows.follow(user, username);
  }

  @Delete(':username/follow')
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  unfollow(
    @CurrentUser() user: User,
    @Param() { username }: UsernameParamsDto,
  ): Promise<void> {
    return this.follows.unfollow(user, username);
  }

  @Get(':username/followers')
  followers(
    @CurrentUser() user: User,
    @Param() { username }: UsernameParamsDto,
    @Query() { offset }: FollowsPageQueryDto,
  ): Promise<ProfileSummary[]> {
    return this.follows.list(user, username, 'followers', offset);
  }

  @Get(':username/following')
  following(
    @CurrentUser() user: User,
    @Param() { username }: UsernameParamsDto,
    @Query() { offset }: FollowsPageQueryDto,
  ): Promise<ProfileSummary[]> {
    return this.follows.list(user, username, 'following', offset);
  }
}
