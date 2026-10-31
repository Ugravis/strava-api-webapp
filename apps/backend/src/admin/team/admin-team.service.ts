import {
  ADMIN_ROLES,
  ADMIN_TEAM_CANDIDATES_LIMIT,
  type AdminRole,
  type AdminTeamCandidate,
  type AdminTeamMember,
  highestAdminRole,
} from '@kilotrace/shared/admin';
import {
  mapTablePage,
  type TablePage,
  type TableQuery,
} from '@kilotrace/shared/table';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Session } from '../../auth/sessions/session.entity';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { NotificationsService } from '../../notifications/notifications.service';
import { avatarUrlFor } from '../../users/dto/user-response';
import { UserTagAssignment } from '../../users/user-tag-assignment.entity';
import { User } from '../../users/user.entity';
import { likeEscaped } from '../common/like-escaped';
import { runTableQuery, type TableSpec } from '../common/table-query';

/** User tag shown on the profiles of the team, kept in step with the roles. */
const TEAM_USER_TAG = 'team';

const hasRole = (name: AdminRole) => `'${name}' = ANY(user.roles)`;
/** The rank of the highest role, from 1 for the lowest. */
const RANK = `CASE ${[...ADMIN_ROLES]
  .map((name, index) => ({ name, rank: index + 1 }))
  .reverse()
  .map(({ name, rank }) => `WHEN ${hasRole(name)} THEN ${rank}`)
  .join(' ')} END`;
const HIGHEST_ROLE = `CASE ${[...ADMIN_ROLES]
  .reverse()
  .map((name) => `WHEN ${hasRole(name)} THEN '${name}'`)
  .join(' ')} END`;

/** Entries of the logs authored by the member, masked ones left out. */
const LOGS_COUNT = `(SELECT COUNT(*) FROM admin_audit_log entry WHERE entry.actor_id = "user"."id" AND entry.hidden_at IS NULL)`;
/** The latest grant of a role to the member, i.e. of the current one. */
const ROLE_SINCE = `(SELECT MAX(entry.created_at) FROM admin_audit_log entry WHERE entry.target_type = 'user' AND entry.target_id = CAST("user"."id" AS text) AND entry.action IN ('roles.grant', 'roles.bootstrap') AND entry.succeeded)`;

const TEAM_TABLE: TableSpec = {
  search: ['user.username', 'user.display_name', 'user.email'],
  sorts: {
    member: 'user.username',
    role: RANK,
    email: 'user.email',
    logsCount: LOGS_COUNT,
    roleSince: ROLE_SINCE,
    lastSeenAt:
      '(SELECT MAX(session.last_seen_at) FROM sessions session WHERE session.user_id = "user"."id")',
  },
  defaultSort: { id: 'role', desc: true },
  tiebreak: 'user.id',
  facets: {
    role: {
      options: Object.fromEntries(
        ADMIN_ROLES.map((name) => [name, `${HIGHEST_ROLE} = '${name}'`]),
      ),
    },
  },
  // Highest role first: the key of a group is its rank from the top.
  groupings: { role: `${ADMIN_ROLES.length + 1} - ${RANK}` },
};

/**
 * Back-office roles of the accounts. One role per member, each granting
 * everything the lower ones grant; joining the team awards the `team`
 * user tag, leaving it withdraws it.
 */
@Injectable()
export class AdminTeamService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly notifications: NotificationsService,
  ) {}

  /** The team, highest role first, then by username. */
  async members(): Promise<AdminTeamMember[]> {
    const users = await this.users
      .createQueryBuilder('user')
      .where('cardinality(user.roles) > 0')
      .getMany();
    return (await this.membersOf(users)).sort(
      (a, b) =>
        ADMIN_ROLES.indexOf(b.role) - ADMIN_ROLES.indexOf(a.role) ||
        a.username.localeCompare(b.username),
    );
  }

  /** A page of the data table of the team. */
  async table(query: TableQuery): Promise<TablePage<AdminTeamMember>> {
    // Only back-office roles, so that every row maps to a member.
    const base = this.users
      .createQueryBuilder('user')
      .where(`(${ADMIN_ROLES.map(hasRole).join(' OR ')})`);
    const page = await runTableQuery(base, query, TEAM_TABLE);
    return mapTablePage(page, (users) => this.membersOf(users));
  }

  /** The members in the shape of the API, in the order of `users`. */
  private async membersOf(users: User[]): Promise<AdminTeamMember[]> {
    const lastSeen = users.length
      ? await this.sessions
          .createQueryBuilder('session')
          .select('session.user_id', 'userId')
          .addSelect('MAX(session.last_seen_at)', 'lastSeenAt')
          .where({ userId: In(users.map(({ id }) => id)) })
          .groupBy('session.user_id')
          .getRawMany<{ userId: string; lastSeenAt: Date }>()
      : [];
    const lastSeenById = new Map(
      lastSeen.map(({ userId, lastSeenAt }) => [userId, lastSeenAt]),
    );
    const logs = users.length
      ? await this.users
          .createQueryBuilder('user')
          .select('user.id', 'id')
          .addSelect(LOGS_COUNT, 'logsCount')
          .addSelect(ROLE_SINCE, 'roleSince')
          .where({ id: In(users.map(({ id }) => id)) })
          .getRawMany<{
            id: string;
            logsCount: string;
            roleSince: Date | null;
          }>()
      : [];
    const logsById = new Map(logs.map((row) => [row.id, row]));
    return users.flatMap((user) => {
      const role = highestAdminRole(user.roles);
      return role
        ? [
            {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: avatarUrlFor(user),
              email: user.email,
              role,
              lastSeenAt: lastSeenById.get(user.id)?.toISOString() ?? null,
              logsCount: Number(logsById.get(user.id)?.logsCount ?? 0),
              roleSince:
                logsById.get(user.id)?.roleSince?.toISOString() ?? null,
            },
          ]
        : [];
    });
  }

  /** Accounts outside the team matching `q`, for the addition of a member. */
  async candidates(q: string | undefined): Promise<AdminTeamCandidate[]> {
    if (!q) {
      return [];
    }
    const contains = `%${likeEscaped(q.toLowerCase())}%`;
    const users = await this.users
      .createQueryBuilder('user')
      .where('cardinality(user.roles) = 0')
      .andWhere(
        '(user.username LIKE :contains OR lower(user.display_name) LIKE :contains OR lower(user.email) LIKE :contains)',
        { contains },
      )
      .orderBy('user.username')
      .limit(ADMIN_TEAM_CANDIDATES_LIMIT)
      .getMany();
    return users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: avatarUrlFor(user),
      email: user.email,
    }));
  }

  /** Adds the account to the team, or changes the role of a member. */
  async setRole(actor: User, id: string, role: AdminRole): Promise<void> {
    const user = await this.findOther(actor, id);
    if (highestAdminRole(user.roles) === role && user.roles.length === 1) {
      return;
    }
    await this.users.manager.transaction(async (manager) => {
      await manager.update(User, user.id, { roles: [role] });
      await manager
        .createQueryBuilder()
        .insert()
        .into(UserTagAssignment)
        .values({ userId: user.id, kind: TEAM_USER_TAG })
        .orIgnore()
        .execute();
    });
    await this.notifications.notifyFromTeam(user.id, 'role_changed', { role });
  }

  /** Removes the member from the team. */
  async remove(actor: User, id: string): Promise<void> {
    const user = await this.findOther(actor, id);
    if (user.roles.length === 0) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'Not a team member');
    }
    await this.users.manager.transaction(async (manager) => {
      await manager.update(User, user.id, { roles: [] });
      await manager.delete(UserTagAssignment, {
        userId: user.id,
        kind: TEAM_USER_TAG,
      });
    });
    await this.notifications.notifyFromTeam(user.id, 'role_changed', {
      role: null,
    });
  }

  /** The target of a change of roles: never the actor. */
  private async findOther(actor: User, id: string): Promise<User> {
    if (id === actor.id) {
      throw ApiErrors.forbidden(
        ApiErrorCode.AdminForbidden,
        'Your own role cannot be changed',
      );
    }
    const user = await this.users.findOneBy({ id });
    if (!user) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'User not found');
    }
    return user;
  }
}
