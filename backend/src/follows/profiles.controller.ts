import {
  Body,
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
  SetPrivacyDto,
  UsernameParamsDto,
} from './follows.dto';
import {
  FollowsService,
  type FollowStatus,
  type FollowsSummary,
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

  /** Users asking to follow the private profile of the current user. */
  @Get('me/requests')
  requests(
    @CurrentUser() user: User,
    @Query() { offset }: FollowsPageQueryDto,
  ): Promise<ProfileSummary[]> {
    return this.follows.requests(user, offset);
  }

  /** Users the current one asked to follow, not accepted yet. */
  @Get('me/sent-requests')
  sentRequests(
    @CurrentUser() user: User,
    @Query() { offset }: FollowsPageQueryDto,
  ): Promise<ProfileSummary[]> {
    return this.follows.sentRequests(user, offset);
  }

  @Get('me/summary')
  summary(@CurrentUser() user: User): Promise<FollowsSummary> {
    return this.follows.summary(user);
  }

  @Put('me/privacy')
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  setPrivacy(
    @CurrentUser() user: User,
    @Body() { private: profilePrivate }: SetPrivacyDto,
  ): Promise<void> {
    return this.follows.setPrivate(user, profilePrivate);
  }

  @Get(':username')
  profile(
    @CurrentUser() user: User,
    @Param() { username }: UsernameParamsDto,
  ): Promise<PublicProfile> {
    return this.follows.profile(user, username);
  }

  @Put(':username/follow')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async follow(
    @CurrentUser() user: User,
    @Param() { username }: UsernameParamsDto,
  ): Promise<{ status: FollowStatus }> {
    return { status: await this.follows.follow(user, username) };
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

  @Put(':username/like')
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  like(
    @CurrentUser() user: User,
    @Param() { username }: UsernameParamsDto,
  ): Promise<void> {
    return this.follows.like(user, username);
  }

  @Delete(':username/like')
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  unlike(
    @CurrentUser() user: User,
    @Param() { username }: UsernameParamsDto,
  ): Promise<void> {
    return this.follows.unlike(user, username);
  }

  /** Accepts the request of the user to follow the current one. */
  @Put(':username/follower')
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  acceptFollower(
    @CurrentUser() user: User,
    @Param() { username }: UsernameParamsDto,
  ): Promise<void> {
    return this.follows.acceptFollower(user, username);
  }

  /** Removes a follower of the current user, or declines their request. */
  @Delete(':username/follower')
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  removeFollower(
    @CurrentUser() user: User,
    @Param() { username }: UsernameParamsDto,
  ): Promise<void> {
    return this.follows.removeFollower(user, username);
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
