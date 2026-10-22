import { BadRequestException, ConflictException } from '@nestjs/common';
import { QueryFailedError, type Repository } from 'typeorm';
import type { NotificationsService } from '../notifications/notifications.service';
import type { User } from '../users/user.entity';
import type { Follow } from './follow.entity';
import { FollowsService } from './follows.service';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'viewer-id',
    email: 'jean@example.com',
    passwordHash: null,
    username: 'jean',
    displayName: null,
    avatarKey: null,
    externalAvatarUrl: null,
    termsAcceptedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const uniqueViolation = () =>
  new QueryFailedError('INSERT', [], {
    code: '23505',
    detail:
      'Key (follower_id, followed_id)=(viewer-id, other-id) already exists.',
  } as unknown as Error);

describe('FollowsService', () => {
  const viewer = buildUser();
  const other = buildUser({ id: 'other-id', username: 'marie' });
  let follows: jest.Mocked<Pick<Repository<Follow>, 'insert' | 'delete'>>;
  let users: jest.Mocked<Pick<Repository<User>, 'findOneBy'>>;
  let notifications: jest.Mocked<
    Pick<NotificationsService, 'notify' | 'withdraw'>
  >;
  let service: FollowsService;

  beforeEach(() => {
    follows = { insert: jest.fn(), delete: jest.fn() };
    users = { findOneBy: jest.fn() };
    notifications = { notify: jest.fn(), withdraw: jest.fn() };
    service = new FollowsService(
      follows as unknown as Repository<Follow>,
      users as unknown as Repository<User>,
      notifications as unknown as NotificationsService,
    );
  });

  it('follows another user and notifies them', async () => {
    users.findOneBy.mockResolvedValue(other);

    await service.follow(viewer, 'marie');

    expect(follows.insert).toHaveBeenCalledWith({
      followerId: 'viewer-id',
      followedId: 'other-id',
    });
    expect(notifications.notify).toHaveBeenCalledWith(
      'other-id',
      'follow',
      viewer,
    );
  });

  it('rejects following oneself', async () => {
    users.findOneBy.mockResolvedValue(viewer);

    await expect(service.follow(viewer, 'jean')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(follows.insert).not.toHaveBeenCalled();
  });

  it('rejects following the same user twice', async () => {
    users.findOneBy.mockResolvedValue(other);
    follows.insert.mockRejectedValue(uniqueViolation());

    await expect(service.follow(viewer, 'marie')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('withdraws the notification on unfollow', async () => {
    users.findOneBy.mockResolvedValue(other);
    follows.delete.mockResolvedValue({ affected: 1, raw: [] });

    await service.unfollow(viewer, 'marie');

    expect(notifications.withdraw).toHaveBeenCalledWith(
      'other-id',
      'follow',
      'viewer-id',
    );
  });
});
