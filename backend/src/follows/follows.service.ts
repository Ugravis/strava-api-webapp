import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { isUniqueViolation } from '../common/database-errors';
import { NotificationsService } from '../notifications/notifications.service';
import { type PublicUser, toPublicUser } from '../users/dto/public-user';
import type { FavoriteSport } from '../users/favorite-sports';
import {
  type DistinctionKind,
  UserDistinction,
} from '../users/user-distinction.entity';
import { User } from '../users/user.entity';
import { Follow } from './follow.entity';
import { ProfileLike } from './profile-like.entity';
import {
  type ProfileShowcase,
  ProfileShowcaseService,
} from './profile-showcase.service';

/** Another user as the viewer sees them in a list. */
export interface ProfileSummary extends PublicUser {
  /** Whether the viewer follows them. */
  followed: boolean;
  /** Whether the viewer asked to follow their private profile, not accepted yet. */
  requested: boolean;
}

export interface PublicProfile extends ProfileSummary {
  createdAt: string;
  bio: string | null;
  city: string | null;
  countryCode: string | null;
  favoriteSports: FavoriteSport[];
  /** `#rrggbb`; null for the default hue. */
  color: string | null;
  private: boolean;
  /** Badges of the membership, shown even on a private profile. */
  distinctions: { kind: DistinctionKind; awardedAt: string }[];
  /**
   * False for a private profile the viewer does not follow: its showcase and
   * its follows are hidden.
   */
  visible: boolean;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  /** Whether the viewer likes the profile; who likes it is never told. */
  liked: boolean;
  /** Whether they follow the viewer. */
  followsViewer: boolean;
  /** Whether they asked to follow the private profile of the viewer, not accepted yet. */
  requestedViewer: boolean;
  /** Whether it is the profile of the viewer. */
  self: boolean;
  /** Null when hidden, or when showcases are disabled. */
  showcase: ProfileShowcase | null;
  /** Follow requests waiting for the viewer; null on the profile of someone else. */
  requestsCount: number | null;
}

/** What the navigation and the profile page tell about the follows of the viewer. */
export interface FollowsSummary {
  followingCount: number;
  /** Requests waiting for the viewer. */
  requestsCount: number;
  /** Whether one of them was never seen in the notifications. */
  unseenRequests: boolean;
}

export type FollowDirection = 'followers' | 'following';

/** Following a public profile is immediate; following a private one is a request. */
export type FollowStatus = 'following' | 'requested';

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
    @InjectRepository(UserDistinction)
    private readonly distinctions: Repository<UserDistinction>,
    @InjectRepository(ProfileLike)
    private readonly likes: Repository<ProfileLike>,
    private readonly notifications: NotificationsService,
    private readonly showcases: ProfileShowcaseService,
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
    const self = user.id === viewer.id;
    const [
      followersCount,
      followingCount,
      viewerFollow,
      followOfViewer,
      distinctions,
      likesCount,
      liked,
    ] = await Promise.all([
      this.follows.countBy({ followedId: user.id, pending: false }),
      this.follows.countBy({ followerId: user.id, pending: false }),
      this.follows.findOneBy({ followerId: viewer.id, followedId: user.id }),
      this.follows.findOneBy({ followerId: user.id, followedId: viewer.id }),
      this.distinctions.find({
        where: { userId: user.id },
        order: { awardedAt: 'ASC' },
      }),
      this.likes.countBy({ profileId: user.id }),
      this.likes.existsBy({ userId: viewer.id, profileId: user.id }),
    ]);
    const followed = viewerFollow?.pending === false;
    const visible = self || !user.profilePrivate || followed;
    const [showcase, requestsCount] = await Promise.all([
      visible ? this.showcases.of(user.id) : null,
      self
        ? this.follows.countBy({ followedId: user.id, pending: true })
        : null,
    ]);
    return {
      ...toPublicUser(user),
      followed,
      requested: viewerFollow?.pending === true,
      createdAt: user.createdAt.toISOString(),
      bio: user.bio,
      city: user.city,
      countryCode: user.countryCode,
      favoriteSports: user.favoriteSports,
      color: user.profileColor,
      private: user.profilePrivate,
      distinctions: distinctions.map(({ kind, awardedAt }) => ({
        kind,
        awardedAt: awardedAt.toISOString(),
      })),
      visible,
      followersCount,
      followingCount,
      likesCount,
      liked,
      followsViewer: followOfViewer?.pending === false,
      requestedViewer: followOfViewer?.pending === true,
      self,
      showcase,
      requestsCount,
    };
  }

  /** Follows a public profile, or asks to follow a private one. */
  async follow(viewer: User, username: string): Promise<FollowStatus> {
    const user = await this.findByUsername(username);
    if (user.id === viewer.id) {
      throw ApiErrors.badRequest(
        ApiErrorCode.CannotFollowSelf,
        'Users cannot follow themselves',
      );
    }
    const pending = user.profilePrivate;
    try {
      await this.follows.insert({
        followerId: viewer.id,
        followedId: user.id,
        pending,
      });
    } catch (error) {
      if (isUniqueViolation(error, 'follower_id, followed_id')) {
        throw ApiErrors.conflict(
          ApiErrorCode.AlreadyFollowing,
          'This user is already followed',
        );
      }
      throw error;
    }
    await this.notifications.notify(
      user.id,
      pending ? 'follow_request' : 'follow',
      viewer,
    );
    return pending ? 'requested' : 'following';
  }

  /** Likes the profile of another user; liking it again changes nothing. */
  async like(viewer: User, username: string): Promise<void> {
    const user = await this.findByUsername(username);
    if (user.id === viewer.id) {
      throw ApiErrors.badRequest(
        ApiErrorCode.CannotLikeSelf,
        'Users cannot like their own profile',
      );
    }
    if (await this.likes.existsBy({ userId: viewer.id, profileId: user.id })) {
      return;
    }
    await this.likes
      .createQueryBuilder()
      .insert()
      .values({ userId: viewer.id, profileId: user.id })
      .orIgnore()
      .execute();
    // Notified once per like, anonymously.
    await this.notifications.notify(user.id, 'profile_like', viewer);
  }

  async unlike(viewer: User, username: string): Promise<void> {
    const user = await this.findByUsername(username);
    const { affected } = await this.likes.delete({
      userId: viewer.id,
      profileId: user.id,
    });
    if (affected) {
      await this.notifications.withdraw(user.id, 'profile_like', viewer.id);
    }
  }

  /** Unfollows a user, or cancels a request to follow them. */
  async unfollow(viewer: User, username: string): Promise<void> {
    const user = await this.findByUsername(username);
    const follow = await this.removeFollow(viewer.id, user.id);
    await (follow.pending
      ? this.notifications.discard(user.id, 'follow_request', viewer.id)
      : this.notifications.withdraw(user.id, 'follow', viewer.id));
  }

  /** Accepts the request of a user to follow the viewer. */
  async acceptFollower(viewer: User, username: string): Promise<void> {
    const user = await this.findByUsername(username);
    const { affected } = await this.follows.update(
      { followerId: user.id, followedId: viewer.id, pending: true },
      { pending: false },
    );
    if (!affected) {
      throw ApiErrors.notFound(
        ApiErrorCode.NoFollowRequest,
        'This user did not ask to follow you',
      );
    }
    await this.notifications.convert(
      viewer.id,
      'follow_request',
      'follow',
      user.id,
    );
    await this.notifications.notify(user.id, 'follow_accepted', viewer);
  }

  /** Removes a follower of the viewer, or declines their request. */
  async removeFollower(viewer: User, username: string): Promise<void> {
    const user = await this.findByUsername(username);
    const follow = await this.removeFollow(user.id, viewer.id);
    await this.notifications.discard(
      viewer.id,
      follow.pending ? 'follow_request' : 'follow',
      user.id,
    );
  }

  /** A page of the users asking to follow the viewer, the latest first. */
  async requests(viewer: User, offset: number): Promise<ProfileSummary[]> {
    const page = await this.follows.find({
      where: { followedId: viewer.id, pending: true },
      relations: { follower: true },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: FOLLOWS_PAGE_SIZE,
    });
    return this.summaries(
      viewer,
      page.map((follow) => follow.follower!),
    );
  }

  /** A page of the users the viewer asked to follow, not accepted yet, the latest first. */
  async sentRequests(viewer: User, offset: number): Promise<ProfileSummary[]> {
    const page = await this.follows.find({
      where: { followerId: viewer.id, pending: true },
      relations: { followed: true },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: FOLLOWS_PAGE_SIZE,
    });
    return this.summaries(
      viewer,
      page.map((follow) => follow.followed!),
    );
  }

  async summary(viewer: User): Promise<FollowsSummary> {
    const [followingCount, requestsCount, unseenRequests] = await Promise.all([
      this.follows.countBy({ followerId: viewer.id, pending: false }),
      this.follows.countBy({ followedId: viewer.id, pending: true }),
      this.notifications.hasUnread(viewer.id, 'follow_request'),
    ]);
    return { followingCount, requestsCount, unseenRequests };
  }

  /** Makes the profile of the viewer private, or public: pending requests are then accepted. */
  async setPrivate(viewer: User, profilePrivate: boolean): Promise<void> {
    await this.users.update({ id: viewer.id }, { profilePrivate });
    if (profilePrivate) {
      return;
    }
    const accepted = await this.follows
      .createQueryBuilder()
      .update()
      .set({ pending: false })
      .where('followed_id = :id AND pending', { id: viewer.id })
      .returning('follower_id')
      .execute();
    const followerIds = (accepted.raw as { follower_id: string }[]).map(
      (row) => row.follower_id,
    );
    if (followerIds.length === 0) {
      return;
    }
    await this.notifications.convert(viewer.id, 'follow_request', 'follow');
    for (const followerId of followerIds) {
      await this.notifications.notify(followerId, 'follow_accepted', viewer);
    }
  }

  /** A page of the followers of the user, or of the users they follow, the latest first. */
  async list(
    viewer: User,
    username: string,
    direction: FollowDirection,
    offset: number,
  ): Promise<ProfileSummary[]> {
    const user = await this.findByUsername(username);
    if (
      user.profilePrivate &&
      user.id !== viewer.id &&
      !(await this.follows.existsBy({
        followerId: viewer.id,
        followedId: user.id,
        pending: false,
      }))
    ) {
      throw ApiErrors.forbidden(
        ApiErrorCode.PrivateProfile,
        'This profile is private',
      );
    }
    const followers = direction === 'followers';
    const page = await this.follows.find({
      where: followers
        ? { followedId: user.id, pending: false }
        : { followerId: user.id, pending: false },
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

  /** Deletes the follow, or the request, of one user to another. */
  private async removeFollow(
    followerId: string,
    followedId: string,
  ): Promise<Follow> {
    const follow = await this.follows.findOneBy({ followerId, followedId });
    if (!follow) {
      throw ApiErrors.notFound(
        ApiErrorCode.NotFollowing,
        'This user is not followed',
      );
    }
    await this.follows.delete({ followerId, followedId });
    return follow;
  }

  /** The users, each marked as followed or requested by the viewer, in one query. */
  private async summaries(
    viewer: User,
    users: User[],
  ): Promise<ProfileSummary[]> {
    if (users.length === 0) {
      return [];
    }
    const follows = await this.follows.find({
      select: { followedId: true, pending: true },
      where: {
        followerId: viewer.id,
        followedId: In(users.map(({ id }) => id)),
      },
    });
    const pendingById = new Map(
      follows.map(({ followedId, pending }) => [followedId, pending]),
    );
    return users.map((user) => ({
      ...toPublicUser(user),
      followed: pendingById.get(user.id) === false,
      requested: pendingById.get(user.id) === true,
    }));
  }
}
