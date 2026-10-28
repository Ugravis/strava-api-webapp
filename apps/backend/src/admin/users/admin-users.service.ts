import {
  ADMIN_PAGE_SIZE,
  ADMIN_ROLES,
  type AdminDistinctionKind,
  type AdminPage,
  type AdminUserDetail,
  type AdminUserSummary,
  highestAdminRole,
  isAdminRole,
  type ModeratableField,
} from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { Activity } from '../../activities/activity.entity';
import { AuthService } from '../../auth/auth.service';
import { OAuthAccount } from '../../auth/google/oauth-account.entity';
import { Session } from '../../auth/sessions/session.entity';
import { SessionsService } from '../../auth/sessions/sessions.service';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { ProviderConnection } from '../../connections/provider-connection.entity';
import { Follow } from '../../follows/follow.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { StravaConnectionService } from '../../strava/strava-connection.service';
import { AvatarsService } from '../../users/avatars.service';
import { avatarUrlFor } from '../../users/dto/user-response';
import { UserDistinction } from '../../users/user-distinction.entity';
import { isSuspended, User } from '../../users/user.entity';
import { likeEscaped } from '../common/like-escaped';
import type {
  AdminUsersQueryDto,
  ModerateUserDto,
  SuspendUserDto,
} from './admin-users.dto';

const STRAVA = 'strava';
const ACTIVE = '(user.suspended_at IS NULL OR user.suspended_until <= now())';
const LAST_SEEN =
  '(SELECT MAX(session.last_seen_at) FROM sessions session WHERE session.user_id = "user"."id")';

/** Rank of the highest back-office role, -1 without any. */
function rankOf(user: User): number {
  const role = highestAdminRole(user.roles);
  return role ? ADMIN_ROLES.indexOf(role) : -1;
}

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(ProviderConnection)
    private readonly connections: Repository<ProviderConnection>,
    @InjectRepository(Activity)
    private readonly activities: Repository<Activity>,
    @InjectRepository(Follow) private readonly follows: Repository<Follow>,
    @InjectRepository(UserDistinction)
    private readonly distinctions: Repository<UserDistinction>,
    @InjectRepository(OAuthAccount)
    private readonly oauthAccounts: Repository<OAuthAccount>,
    private readonly sessionsService: SessionsService,
    private readonly auth: AuthService,
    private readonly strava: StravaConnectionService,
    private readonly avatars: AvatarsService,
    private readonly notifications: NotificationsService,
  ) {}

  async page(query: AdminUsersQueryDto): Promise<AdminPage<AdminUserSummary>> {
    const builder = this.users
      .createQueryBuilder('user')
      .offset((query.page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE);
    if (query.q) {
      const contains = `%${likeEscaped(query.q.toLowerCase())}%`;
      builder.andWhere(
        `(user.username LIKE :contains OR lower(user.display_name) LIKE :contains OR lower(user.email) LIKE :contains OR CAST(user.id AS text) = :q)`,
        { contains, q: query.q },
      );
    }
    if (query.status === 'active') {
      builder.andWhere(ACTIVE);
    } else if (query.status === 'suspended') {
      builder.andWhere(`NOT ${ACTIVE}`);
    } else if (query.status === 'staff') {
      builder.andWhere('cardinality(user.roles) > 0');
    }
    const descending = query.sort.endsWith('-desc');
    const order = descending ? 'DESC' : 'ASC';
    if (query.sort.startsWith('username')) {
      builder.orderBy('user.username', order);
    } else if (query.sort.startsWith('last-seen')) {
      // Never seen last, whichever the direction.
      builder.orderBy(LAST_SEEN, order, 'NULLS LAST');
    } else {
      builder.orderBy('user.created_at', order);
    }
    builder.addOrderBy('user.id');

    const [users, total] = await builder.getManyAndCount();
    return {
      items: await this.summaries(users),
      total,
      page: query.page,
      pageSize: ADMIN_PAGE_SIZE,
    };
  }

  async detail(id: string): Promise<AdminUserDetail> {
    const user = await this.find(id);
    const [
      [summary],
      connection,
      activitiesCount,
      followersCount,
      followingCount,
      sessionsCount,
    ] = await Promise.all([
      this.summaries([user]),
      this.connections.findOneBy({ userId: id, provider: STRAVA }),
      this.activities.countBy({ userId: id }),
      this.follows.countBy({ followedId: id, pending: false }),
      this.follows.countBy({ followerId: id, pending: false }),
      this.sessions.countBy({ userId: id }),
    ]);
    return {
      ...summary,
      bio: user.bio,
      city: user.city,
      countryCode: user.countryCode,
      profilePrivate: user.profilePrivate,
      strava: connection && {
        accountName: connection.accountName,
        connectedAt: connection.createdAt.toISOString(),
        lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
      },
      activitiesCount,
      followersCount,
      followingCount,
      sessionsCount,
    };
  }

  /** Refuses sign-in and hides the profile; every session ends at once. */
  async suspend(actor: User, id: string, dto: SuspendUserDto): Promise<void> {
    const user = await this.findActionable(actor, id);
    const until = dto.until ? new Date(dto.until) : null;
    if (until && until <= new Date()) {
      throw ApiErrors.badRequest(
        ApiErrorCode.InvalidSuspension,
        'The end of the suspension must be in the future',
      );
    }
    await this.users.update(user.id, {
      suspendedAt: new Date(),
      suspendedUntil: until,
      suspensionReason: dto.reason?.trim() ?? '',
    });
    await this.sessionsService.revokeAllForUser(user.id);
  }

  async lift(actor: User, id: string): Promise<void> {
    const user = await this.findActionable(actor, id);
    await this.users.update(user.id, {
      suspendedAt: null,
      suspendedUntil: null,
      suspensionReason: null,
    });
  }

  /** Deletes the account and all its data, as its owner would. */
  async delete(actor: User, id: string): Promise<void> {
    await this.auth.purge(await this.findActionable(actor, id));
  }

  /** Revokes the access at Strava and deletes the data synchronized from it. */
  async unlinkStrava(actor: User, id: string, reason: string): Promise<void> {
    const user = await this.findActionable(actor, id);
    if (!(await this.strava.findForUser(user.id))) {
      throw ApiErrors.notFound(
        ApiErrorCode.ProviderNotConnected,
        'No Strava account is linked',
      );
    }
    await this.strava.disconnect(user.id);
    await this.notifications.notifyFromTeam(user.id, 'strava_unlinked', {
      reason,
    });
  }

  async revokeSessions(actor: User, id: string): Promise<void> {
    const user = await this.findActionable(actor, id);
    await this.sessionsService.revokeAllForUser(user.id);
  }

  /**
   * Resets free fields of the profile: cleared, or a generated username,
   * never a text written in the user's stead.
   */
  async moderate(actor: User, id: string, dto: ModerateUserDto): Promise<void> {
    const user = await this.findActionable(actor, id);
    const fields = new Set<ModeratableField>(dto.fields);
    if (fields.has('username')) {
      user.username = await this.generatedUsername();
    }
    if (fields.has('displayName')) {
      user.displayName = null;
    }
    if (fields.has('bio')) {
      user.bio = null;
    }
    if (fields.has('city')) {
      user.city = null;
      user.countryCode = null;
    }
    if (fields.has('avatar')) {
      await this.avatars.deleteQuietly(user.avatarKey);
      user.avatarKey = null;
      user.externalAvatarUrl = null;
    }
    await this.users.save(user);
    await this.notifications.notifyFromTeam(user.id, 'moderation', {
      reason: dto.reason?.trim(),
      fields: dto.fields,
    });
  }

  async grantDistinction(
    id: string,
    kind: AdminDistinctionKind,
  ): Promise<void> {
    await this.find(id);
    await this.distinctions
      .createQueryBuilder()
      .insert()
      .values({ userId: id, kind })
      .orIgnore()
      .execute();
  }

  async revokeDistinction(
    id: string,
    kind: AdminDistinctionKind,
  ): Promise<void> {
    await this.find(id);
    await this.distinctions.delete({ userId: id, kind });
  }

  private async summaries(users: User[]): Promise<AdminUserSummary[]> {
    if (users.length === 0) {
      return [];
    }
    const ids = users.map(({ id }) => id);
    const [lastSeen, connections, googleAccounts, distinctions] =
      await Promise.all([
        this.sessions
          .createQueryBuilder('session')
          .select('session.user_id', 'userId')
          .addSelect('MAX(session.last_seen_at)', 'lastSeenAt')
          .where({ userId: In(ids) })
          .groupBy('session.user_id')
          .getRawMany<{ userId: string; lastSeenAt: Date }>(),
        this.connections.find({
          select: { userId: true },
          where: { userId: In(ids), provider: STRAVA },
        }),
        this.oauthAccounts.find({
          select: { userId: true },
          where: { userId: In(ids) },
        }),
        this.distinctions.find({
          where: { userId: In(ids) },
          order: { awardedAt: 'ASC' },
        }),
      ]);
    const lastSeenById = new Map(
      lastSeen.map(({ userId, lastSeenAt }) => [userId, lastSeenAt]),
    );
    const connected = new Set(connections.map(({ userId }) => userId));
    const withGoogle = new Set(googleAccounts.map(({ userId }) => userId));
    return users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: avatarUrlFor(user),
      email: user.email,
      roles: user.roles.filter(isAdminRole),
      createdAt: user.createdAt.toISOString(),
      lastSeenAt: lastSeenById.get(user.id)?.toISOString() ?? null,
      suspension: isSuspended(user)
        ? {
            reason: user.suspensionReason ?? '',
            since: user.suspendedAt!.toISOString(),
            until: user.suspendedUntil?.toISOString() ?? null,
          }
        : null,
      stravaConnected: connected.has(user.id),
      signInMethods: [
        ...(user.passwordHash ? (['password'] as const) : []),
        ...(withGoogle.has(user.id) ? (['google'] as const) : []),
      ],
      distinctions: distinctions
        .filter(({ userId }) => userId === user.id)
        .map(({ kind, awardedAt }) => ({
          kind,
          awardedAt: awardedAt.toISOString(),
        })),
    }));
  }

  private async find(id: string): Promise<User> {
    const user = await this.users.findOneBy({ id });
    if (!user) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'User not found');
    }
    return user;
  }

  /**
   * The target of an action on an account: never the actor, nor a member of
   * the team of the same rank or above.
   */
  private async findActionable(actor: User, id: string): Promise<User> {
    const user = await this.find(id);
    if (user.id === actor.id || rankOf(user) >= rankOf(actor)) {
      throw ApiErrors.forbidden(
        ApiErrorCode.AdminForbidden,
        'This account cannot be acted upon',
      );
    }
    return user;
  }

  /** `membre_` and random letters and digits, within the username rules. */
  private async generatedUsername(): Promise<string> {
    for (;;) {
      const username = `membre_${randomBytes(8).toString('hex').slice(0, 8)}`;
      if (!(await this.users.existsBy({ username }))) {
        return username;
      }
    }
  }
}
