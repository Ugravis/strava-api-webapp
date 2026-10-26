import { AdminRole } from '@kilotrace/shared';
import type { Repository } from 'typeorm';
import { hashToken } from '../../common/crypto.util';
import type { AdminUser } from '../users/admin-user.entity';
import type { AdminSession } from './admin-session.entity';
import {
  ADMIN_SESSION_IDLE_MS,
  ADMIN_SESSION_MAX_AGE_MS,
  AdminSessionsService,
} from './admin-sessions.service';

const MINUTE_MS = 60 * 1000;

describe('AdminSessionsService', () => {
  let repository: jest.Mocked<
    Pick<Repository<AdminSession>, 'insert' | 'findOne' | 'update' | 'delete'>
  >;
  let service: AdminSessionsService;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-01-01T12:00:00Z') });
    repository = {
      insert: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new AdminSessionsService(
      repository as unknown as Repository<AdminSession>,
    );
  });

  afterEach(() => jest.useRealTimers());

  function storedSession(
    overrides: Partial<AdminSession> = {},
    admin: Partial<AdminUser> = {},
  ): AdminSession {
    return {
      id: 'session-id',
      tokenHash: hashToken('token'),
      adminUserId: 'admin-id',
      adminUser: {
        id: 'admin-id',
        email: 'admin@example.com',
        role: AdminRole.Admin,
        disabledAt: null,
        ...admin,
      } as AdminUser,
      expiresAt: new Date(Date.now() + ADMIN_SESSION_MAX_AGE_MS),
      lastSeenAt: new Date(),
      userAgent: null,
      ipAddress: null,
      createdAt: new Date(),
      ...overrides,
    };
  }

  it('creates a session ending after the maximum age, storing only the token hash', async () => {
    const created = await service.create('admin-id', { ipAddress: '::1' });

    expect(created.expiresAt.getTime()).toBe(
      Date.now() + ADMIN_SESSION_MAX_AGE_MS,
    );
    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: hashToken(created.token),
        adminUserId: 'admin-id',
        ipAddress: '::1',
      }),
    );
  });

  it('loads the back-office account with the session on every validation', async () => {
    repository.findOne.mockResolvedValue(storedSession());

    const validated = await service.validate('token');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { tokenHash: hashToken('token') },
      relations: { adminUser: true },
    });
    expect(validated?.admin.role).toBe(AdminRole.Admin);
  });

  it('rejects an unknown token', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.validate('token')).resolves.toBeNull();
  });

  it('ends a session idle for too long', async () => {
    repository.findOne.mockResolvedValue(
      storedSession({
        lastSeenAt: new Date(Date.now() - ADMIN_SESSION_IDLE_MS - 1),
      }),
    );

    await expect(service.validate('token')).resolves.toBeNull();
    expect(repository.delete).toHaveBeenCalledWith({ id: 'session-id' });
  });

  it('ends a session past its maximum age, even when active', async () => {
    repository.findOne.mockResolvedValue(
      storedSession({ expiresAt: new Date(Date.now() - 1) }),
    );

    await expect(service.validate('token')).resolves.toBeNull();
    expect(repository.delete).toHaveBeenCalledWith({ id: 'session-id' });
  });

  it('revokes every session of a disabled account', async () => {
    repository.findOne.mockResolvedValue(
      storedSession({}, { disabledAt: new Date() }),
    );

    await expect(service.validate('token')).resolves.toBeNull();
    expect(repository.delete).toHaveBeenCalledWith({ adminUserId: 'admin-id' });
  });

  it('records the activity at most once a minute', async () => {
    repository.findOne.mockResolvedValue(
      storedSession({ lastSeenAt: new Date(Date.now() - 30 * 1000) }),
    );
    await service.validate('token');
    expect(repository.update).not.toHaveBeenCalled();

    repository.findOne.mockResolvedValue(
      storedSession({ lastSeenAt: new Date(Date.now() - 2 * MINUTE_MS) }),
    );
    await service.validate('token');
    expect(repository.update).toHaveBeenCalledWith(
      { id: 'session-id' },
      { lastSeenAt: new Date() },
    );
  });
});
