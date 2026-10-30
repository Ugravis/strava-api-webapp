import {
  ADMIN_ROLES,
  type AdminRole,
  type AdminUserDetail,
  type AdminUserSummary,
  highestAdminRole,
  isAdminRole,
  type ModeratableField,
} from '@kilotrace/shared/admin';
import {
  mapTablePage,
  type TablePage,
  type TableQuery,
} from '@kilotrace/shared/table';
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
import { UserTag } from '../../users/user-tag.entity';
import { UserTagAssignment } from '../../users/user-tag-assignment.entity';
import { isSuspended, User } from '../../users/user.entity';
import { runTableQuery, type TableSpec } from '../common/table-query';
import type { ModerateUserDto, SuspendUserDto } from './admin-users.dto';

const STRAVA = 'strava';
const ACTIVE = '(user.suspended_at IS NULL OR user.suspended_until <= now())';
const LAST_SEEN =
  '(SELECT MAX(session.last_seen_at) FROM sessions session WHERE session.user_id = "user"."id")';
const STRAVA_LINKED = `EXISTS (SELECT 1 FROM provider_connections connection WHERE connection.user_id = "user"."id" AND connection.provider = '${STRAVA}')`;
const GOOGLE_LINKED =
  'EXISTS (SELECT 1 FROM oauth_accounts account WHERE account.user_id = "user"."id")';
const role = (name: AdminRole) => `'${name}' = ANY(user.roles)`;

/** The highest back-office role, '' without any, as in `highestAdminRole`. */
const HIGHEST_ROLE = `CASE ${[...ADMIN_ROLES]
  .reverse()
  .map((name) => `WHEN ${role(name)} THEN '${name}'`)
  .join(' ')} ELSE NULL END`;

const USERS_TABLE: TableSpec = {
  search: [
    'user.username',
    'user.display_name',
    'user.email',
    'CAST(user.id AS text)',
  ],
  sorts: {
    user: 'user.username',
    displayName: 'user.display_name',
    createdAt: 'user.created_at',
    lastSeenAt: LAST_SEEN,
    userTags:
      '(SELECT COUNT(*) FROM user_tag_assignments tag WHERE tag.user_id = "user"."id")',
  },
  tiebreak: 'user.id',
  facets: {
    status: { options: { active: ACTIVE, suspended: `NOT ${ACTIVE}` } },
    role: {
      options: {
        ...Object.fromEntries(ADMIN_ROLES.map((name) => [name, role(name)])),
        none: `NOT (${ADMIN_ROLES.map(role).join(' OR ')})`,
      },
    },
    connections: {
      options: {
        strava: STRAVA_LINKED,
        google: GOOGLE_LINKED,
        password: 'user.password_hash IS NOT NULL',
      },
    },
  },
  groupings: {
    status: `CASE WHEN ${ACTIVE} THEN 'active' ELSE 'suspended' END`,
    role: HIGHEST_ROLE,
  },
};

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
    @InjectRepository(UserTagAssignment)
    private readonly userTags: Repository<UserTagAssignment>,
    @InjectRepository(OAuthAccount)
    private readonly oauthAccounts: Repository<OAuthAccount>,
    private readonly sessionsService: SessionsService,
    private readonly auth: AuthService,
    private readonly strava: StravaConnectionService,
    private readonly avatars: AvatarsService,
    private readonly notifications: NotificationsService,
  ) {}

  async table(query: TableQuery): Promise<TablePage<AdminUserSummary>> {
    const page = await runTableQuery(
      this.users.createQueryBuilder('user'),
      query,
      USERS_TABLE,
    );
    return mapTablePage(page, (users) => this.summaries(users));
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

  async grantUserTag(id: string, kind: string): Promise<void> {
    await this.find(id);
    if (!(await this.userTags.manager.existsBy(UserTag, { id: kind }))) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such userTag');
    }
    await this.userTags
      .createQueryBuilder()
      .insert()
      .values({ userId: id, kind })
      .orIgnore()
      .execute();
  }

  async revokeUserTag(id: string, kind: string): Promise<void> {
    await this.find(id);
    await this.userTags.delete({ userId: id, kind });
  }

  private async summaries(users: User[]): Promise<AdminUserSummary[]> {
    if (users.length === 0) {
      return [];
    }
    const ids = users.map(({ id }) => id);
    const [lastSeen, connections, googleAccounts, userTags] = await Promise.all(
      [
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
        this.userTags.find({
          where: { userId: In(ids) },
          relations: { userTag: true },
          order: { userTag: { position: 'ASC' } },
        }),
      ],
    );
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
      userTags: userTags
        .filter(({ userId }) => userId === user.id)
        .map(({ userTag, awardedAt }) => ({
          id: userTag!.id,
          name: userTag!.name,
          icon: userTag!.icon,
          color: userTag!.color,
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
