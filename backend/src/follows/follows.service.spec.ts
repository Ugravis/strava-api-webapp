import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError, type Repository } from 'typeorm';
import type { NotificationsService } from '../notifications/notifications.service';
import type { ProfileShowcaseService } from './profile-showcase.service';
import type { UserDistinction } from '../users/user-distinction.entity';
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
    bio: null,
    city: null,
    favoriteSports: [],
    profileColor: null,
    profilePrivate: true,
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
  const other = buildUser({
    id: 'other-id',
    username: 'marie',
    profilePrivate: false,
  });
  let follows: jest.Mocked<
    Pick<Repository<Follow>, 'insert' | 'delete' | 'findOneBy' | 'update'>
  >;
  let users: jest.Mocked<Pick<Repository<User>, 'findOneBy'>>;
  let notifications: jest.Mocked<
    Pick<NotificationsService, 'notify' | 'withdraw' | 'discard' | 'convert'>
  >;
  let service: FollowsService;

  beforeEach(() => {
    follows = {
      insert: jest.fn(),
      delete: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
    };
    users = { findOneBy: jest.fn() };
    notifications = {
      notify: jest.fn(),
      withdraw: jest.fn(),
      discard: jest.fn(),
      convert: jest.fn(),
    };
    service = new FollowsService(
      follows as unknown as Repository<Follow>,
      users as unknown as Repository<User>,
      {} as Repository<UserDistinction>,
      notifications as unknown as NotificationsService,
      {} as ProfileShowcaseService,
    );
  });

  it('follows another user and notifies them', async () => {
    users.findOneBy.mockResolvedValue(other);

    await expect(service.follow(viewer, 'marie')).resolves.toBe('following');

    expect(follows.insert).toHaveBeenCalledWith({
      followerId: 'viewer-id',
      followedId: 'other-id',
      pending: false,
    });
    expect(notifications.notify).toHaveBeenCalledWith(
      'other-id',
      'follow',
      viewer,
    );
  });

  it('asks to follow a private profile', async () => {
    users.findOneBy.mockResolvedValue({ ...other, profilePrivate: true });

    await expect(service.follow(viewer, 'marie')).resolves.toBe('requested');

    expect(follows.insert).toHaveBeenCalledWith({
      followerId: 'viewer-id',
      followedId: 'other-id',
      pending: true,
    });
    expect(notifications.notify).toHaveBeenCalledWith(
      'other-id',
      'follow_request',
      viewer,
    );
  });

  it('accepts a request and notifies its author', async () => {
    users.findOneBy.mockResolvedValue(other);
    follows.update.mockResolvedValue({
      affected: 1,
      raw: [],
      generatedMaps: [],
    });

    await service.acceptFollower(viewer, 'marie');

    expect(follows.update).toHaveBeenCalledWith(
      { followerId: 'other-id', followedId: 'viewer-id', pending: true },
      { pending: false },
    );
    expect(notifications.convert).toHaveBeenCalledWith(
      'viewer-id',
      'follow_request',
      'follow',
      'other-id',
    );
    expect(notifications.notify).toHaveBeenCalledWith(
      'other-id',
      'follow_accepted',
      viewer,
    );
  });

  it('rejects accepting a request never made', async () => {
    users.findOneBy.mockResolvedValue(other);
    follows.update.mockResolvedValue({
      affected: 0,
      raw: [],
      generatedMaps: [],
    });

    await expect(
      service.acceptFollower(viewer, 'marie'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(notifications.notify).not.toHaveBeenCalled();
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
    follows.findOneBy.mockResolvedValue({ pending: false } as Follow);

    await service.unfollow(viewer, 'marie');

    expect(notifications.withdraw).toHaveBeenCalledWith(
      'other-id',
      'follow',
      'viewer-id',
    );
  });

  it('discards the request once cancelled', async () => {
    users.findOneBy.mockResolvedValue(other);
    follows.findOneBy.mockResolvedValue({ pending: true } as Follow);

    await service.unfollow(viewer, 'marie');

    expect(follows.delete).toHaveBeenCalledWith({
      followerId: 'viewer-id',
      followedId: 'other-id',
    });
    expect(notifications.discard).toHaveBeenCalledWith(
      'other-id',
      'follow_request',
      'viewer-id',
    );
  });
});
