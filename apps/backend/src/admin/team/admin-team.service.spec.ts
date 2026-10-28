import { AdminRole } from '@kilotrace/shared/admin';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { EntityManager, Repository } from 'typeorm';
import type { NotificationsService } from '../../notifications/notifications.service';
import { UserDistinction } from '../../users/user-distinction.entity';
import { User } from '../../users/user.entity';
import { AdminTeamService } from './admin-team.service';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'target-id',
    email: 'marie@example.com',
    username: 'marie',
    roles: [],
    ...overrides,
  } as User;
}

describe('AdminTeamService', () => {
  const superAdmin = buildUser({
    id: 'super-id',
    roles: [AdminRole.SuperAdmin],
  });
  let target: User;
  let manager: {
    update: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let inserted: unknown[];
  let notifications: jest.Mocked<Pick<NotificationsService, 'notifyFromTeam'>>;
  let service: AdminTeamService;

  beforeEach(() => {
    target = buildUser();
    inserted = [];
    const insert = {
      insert: () => insert,
      into: () => insert,
      values: (values: unknown) => (inserted.push(values), insert),
      orIgnore: () => insert,
      execute: jest.fn(),
    };
    manager = {
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => insert),
    };
    const users = {
      findOneBy: jest.fn(({ id }: { id: string }) =>
        Promise.resolve(id === target.id ? target : null),
      ),
      manager: {
        transaction: (work: (manager: EntityManager) => Promise<void>) =>
          work(manager as unknown as EntityManager),
      },
    };
    notifications = { notifyFromTeam: jest.fn() };
    service = new AdminTeamService(
      users as unknown as Repository<User>,
      {} as never,
      notifications as unknown as NotificationsService,
    );
  });

  it('adds an account with the team distinction and tells it', async () => {
    await service.setRole(superAdmin, target.id, AdminRole.Support);

    expect(manager.update).toHaveBeenCalledWith(User, target.id, {
      roles: [AdminRole.Support],
    });
    expect(inserted).toEqual([{ userId: target.id, kind: 'team' }]);
    expect(notifications.notifyFromTeam).toHaveBeenCalledWith(
      target.id,
      'role_changed',
      { role: AdminRole.Support },
    );
  });

  it('keeps a single role when changing it', async () => {
    target.roles = [AdminRole.Support, AdminRole.Admin];

    await service.setRole(superAdmin, target.id, AdminRole.SuperAdmin);

    expect(manager.update).toHaveBeenCalledWith(User, target.id, {
      roles: [AdminRole.SuperAdmin],
    });
  });

  it('does nothing when the role is unchanged', async () => {
    target.roles = [AdminRole.Admin];

    await service.setRole(superAdmin, target.id, AdminRole.Admin);

    expect(manager.update).not.toHaveBeenCalled();
    expect(notifications.notifyFromTeam).not.toHaveBeenCalled();
  });

  it('removes a member and the team distinction', async () => {
    target.roles = [AdminRole.Admin];

    await service.remove(superAdmin, target.id);

    expect(manager.update).toHaveBeenCalledWith(User, target.id, { roles: [] });
    expect(manager.delete).toHaveBeenCalledWith(UserDistinction, {
      userId: target.id,
      kind: 'team',
    });
    expect(notifications.notifyFromTeam).toHaveBeenCalledWith(
      target.id,
      'role_changed',
      { role: null },
    );
  });

  it('refuses to remove an account outside the team', async () => {
    await expect(service.remove(superAdmin, target.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('never acts on the actor', async () => {
    await expect(
      service.setRole(superAdmin, superAdmin.id, AdminRole.Support),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.remove(superAdmin, superAdmin.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(manager.update).not.toHaveBeenCalled();
  });
});
