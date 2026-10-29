import {
  ADMIN_ROLES,
  ADMIN_TEAM_CANDIDATES_LIMIT,
  type AdminRole,
  type AdminTeamCandidate,
  type AdminTeamMember,
  highestAdminRole,
} from '@kilotrace/shared/admin';
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

/** User tag shown on the profiles of the team, kept in step with the roles. */
const TEAM_USER_TAG = 'team';

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
    return users
      .flatMap((user) => {
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
              },
            ]
          : [];
      })
      .sort(
        (a, b) =>
          ADMIN_ROLES.indexOf(b.role) - ADMIN_ROLES.indexOf(a.role) ||
          a.username.localeCompare(b.username),
      );
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
