import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { isUniqueViolation } from '../common/database-errors';
import { NotificationsService } from '../notifications/notifications.service';
import { type PublicUser, toPublicUser } from '../users/dto/public-user';
import { User } from '../users/user.entity';
import { Follow } from './follow.entity';

/** Another user as the viewer sees them in a list. */
export interface ProfileSummary extends PublicUser {
  /** Whether the viewer follows them. */
  followed: boolean;
}

export interface PublicProfile extends ProfileSummary {
  createdAt: string;
  followersCount: number;
  followingCount: number;
  /** Whether they follow the viewer. */
  followsViewer: boolean;
  /** Whether it is the profile of the viewer. */
  self: boolean;
}

export type FollowDirection = 'followers' | 'following';

export const FOLLOWS_PAGE_SIZE = 30;
const SEARCH_LIMIT = 20;

/** Escapes the wildcards of a LIKE pattern. */
const likeEscaped = (text: string) => text.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private readonly follows: Repository<Follow>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly notifications: NotificationsService,
  ) {}

  /** Users whose username or display name contains the text, those starting with it first. */
  async search(viewer: User, text: string): Promise<ProfileSummary[]> {
    const lowered = text.toLowerCase();
    const found = await this.users
      .createQueryBuilder('user')
      .where('user.id <> :viewerId', { viewerId: viewer.id })
      .andWhere(
        '(user.username LIKE :contains OR lower(user.display_name) LIKE :contains)',
        { contains: `%${likeEscaped(lowered)}%` },
      )
      .orderBy(
        'CASE WHEN user.username LIKE :prefix OR lower(user.display_name) LIKE :prefix THEN 0 ELSE 1 END',
      )
      .addOrderBy('user.username')
      .setParameter('prefix', `${likeEscaped(lowered)}%`)
      .limit(SEARCH_LIMIT)
      .getMany();
    return this.summaries(viewer, found);
  }

  async profile(viewer: User, username: string): Promise<PublicProfile> {
    const user = await this.findByUsername(username);
    const [followersCount, followingCount, followed, followsViewer] =
      await Promise.all([
        this.follows.countBy({ followedId: user.id }),
        this.follows.countBy({ followerId: user.id }),
        this.follows.existsBy({ followerId: viewer.id, followedId: user.id }),
        this.follows.existsBy({ followerId: user.id, followedId: viewer.id }),
      ]);
    return {
      ...toPublicUser(user),
      followed,
      createdAt: user.createdAt.toISOString(),
      followersCount,
      followingCount,
      followsViewer,
      self: user.id === viewer.id,
    };
  }

  async follow(viewer: User, username: string): Promise<void> {
    const user = await this.findByUsername(username);
    if (user.id === viewer.id) {
      throw ApiErrors.badRequest(
        ApiErrorCode.CannotFollowSelf,
        'Users cannot follow themselves',
      );
    }
    try {
      await this.follows.insert({ followerId: viewer.id, followedId: user.id });
    } catch (error) {
      if (isUniqueViolation(error, 'follower_id, followed_id')) {
        throw ApiErrors.conflict(
          ApiErrorCode.AlreadyFollowing,
          'This user is already followed',
        );
      }
      throw error;
    }
    await this.notifications.notify(user.id, 'follow', viewer);
  }

  async unfollow(viewer: User, username: string): Promise<void> {
    const user = await this.findByUsername(username);
    const { affected } = await this.follows.delete({
      followerId: viewer.id,
      followedId: user.id,
    });
    if (!affected) {
      throw ApiErrors.notFound(
        ApiErrorCode.NotFollowing,
        'This user is not followed',
      );
    }
    await this.notifications.withdraw(user.id, 'follow', viewer.id);
  }

  /** A page of the followers of the user, or of the users they follow, the latest first. */
  async list(
    viewer: User,
    username: string,
    direction: FollowDirection,
    offset: number,
  ): Promise<ProfileSummary[]> {
    const user = await this.findByUsername(username);
    const followers = direction === 'followers';
    const page = await this.follows.find({
      where: followers ? { followedId: user.id } : { followerId: user.id },
      relations: followers ? { follower: true } : { followed: true },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: FOLLOWS_PAGE_SIZE,
    });
    return this.summaries(
      viewer,
      page.map((follow) => (followers ? follow.follower! : follow.followed!)),
    );
  }

  private async findByUsername(username: string): Promise<User> {
    const user = await this.users.findOneBy({ username });
    if (!user) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'User not found');
    }
    return user;
  }

  /** The users, each marked as followed by the viewer or not, in one query. */
  private async summaries(
    viewer: User,
    users: User[],
  ): Promise<ProfileSummary[]> {
    if (users.length === 0) {
      return [];
    }
    const followed = await this.follows.find({
      select: { followedId: true },
      where: {
        followerId: viewer.id,
        followedId: In(users.map(({ id }) => id)),
      },
    });
    const followedIds = new Set(followed.map(({ followedId }) => followedId));
    return users.map((user) => ({
      ...toPublicUser(user),
      followed: followedIds.has(user.id),
    }));
  }
}
