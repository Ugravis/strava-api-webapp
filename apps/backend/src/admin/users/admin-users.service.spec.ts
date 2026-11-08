import { AdminRole } from '@kilotrace/shared/admin';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { SessionsService } from '../../auth/sessions/sessions.service';
import type { NotificationsService } from '../../notifications/notifications.service';
import type { AvatarsService } from '../../users/avatars.service';
import type { User } from '../../users/user.entity';
import { AdminUsersService } from './admin-users.service';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'target-id',
    email: 'marie@example.com',
    passwordHash: null,
    username: 'marie',
    displayName: 'Marie',
    avatarKey: 'avatars/marie.webp',
    externalAvatarUrl: null,
    bio: 'Offensive bio',
    city: 'Lyon',
    countryCode: 'FR',
    favoriteSports: [],
    profileColor: null,
    profilePrivate: true,
    roles: [],
    suspendedAt: null,
    suspendedUntil: null,
    suspensionReason: null,
    termsAcceptedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AdminUsersService', () => {
  const admin = buildUser({ id: 'admin-id', roles: [AdminRole.Admin] });
  let target: User;
  let users: jest.Mocked<
    Pick<Repository<User>, 'findOneBy' | 'update' | 'save' | 'existsBy'>
  >;
  let sessions: jest.Mocked<Pick<SessionsService, 'revokeAllForUser'>>;
  let notifications: jest.Mocked<Pick<NotificationsService, 'notifyFromTeam'>>;
  let avatars: jest.Mocked<Pick<AvatarsService, 'deleteQuietly'>>;
  let service: AdminUsersService;

  beforeEach(() => {
    target = buildUser();
    users = {
      findOneBy: jest.fn(({ id }: { id: string }) =>
        Promise.resolve(id === admin.id ? admin : target),
      ),
      update: jest.fn(),
      save: jest.fn((user: User) => Promise.resolve(user)),
      existsBy: jest.fn().mockResolvedValue(false),
    } as unknown as typeof users;
    sessions = { revokeAllForUser: jest.fn() };
    notifications = { notifyFromTeam: jest.fn() };
    avatars = { deleteQuietly: jest.fn() };
    const unused = {} as never;
    service = new AdminUsersService(
      users as unknown as Repository<User>,
      unused,
      unused,
      unused,
      unused,
      unused,
      unused,
      sessions as unknown as SessionsService,
      unused,
      unused,
      avatars as unknown as AvatarsService,
      notifications as unknown as NotificationsService,
    );
  });

  describe('target of an action', () => {
    it('is never the actor', async () => {
      await expect(
        service.suspend(admin, admin.id, { reason: 'Test' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('is never a member of the team of the same rank or above', async () => {
      target = buildUser({ roles: [AdminRole.Admin] });
      await expect(
        service.suspend(admin, target.id, { reason: 'Test' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(users.update).not.toHaveBeenCalled();
    });

    it('may be a member of a lower rank', async () => {
      target = buildUser({ roles: [AdminRole.Support] });
      await service.revokeSessions(admin, target.id);
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith(target.id);
    });
  });

  describe('suspend', () => {
    it('stores the suspension and ends every session', async () => {
      const until = new Date(Date.now() + 86_400_000).toISOString();
      await service.suspend(admin, target.id, { reason: ' Spam ', until });
      expect(users.update).toHaveBeenCalledWith(target.id, {
        suspendedAt: expect.any(Date) as Date,
        suspendedUntil: new Date(until),
        suspensionReason: 'Spam',
      });
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith(target.id);
    });

    it('refuses an end in the past', async () => {
      await expect(
        service.suspend(admin, target.id, {
          reason: 'Spam',
          until: new Date(Date.now() - 1000).toISOString(),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('moderate', () => {
    it('resets the chosen fields only, and tells the user why', async () => {
      await service.moderate(admin, target.id, {
        fields: ['username', 'bio', 'avatar'],
        reason: 'Offensive',
      });
      expect(users.save).toHaveBeenCalledWith(
        expect.objectContaining({
          username: expect.stringMatching(/^membre_[0-9a-f]{8}$/) as string,
          displayName: 'Marie',
          bio: null,
          city: 'Lyon',
          avatarKey: null,
        }),
      );
      expect(avatars.deleteQuietly).toHaveBeenCalledWith('avatars/marie.webp');
      expect(notifications.notifyFromTeam).toHaveBeenCalledWith(
        target.id,
        'moderation',
        { reason: 'Offensive', fields: ['username', 'bio', 'avatar'] },
      );
    });
  });
});
