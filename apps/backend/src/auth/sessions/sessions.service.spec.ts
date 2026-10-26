import type { Repository } from 'typeorm';
import type { AuthConfig } from '../../config/auth.config';
import { hashToken } from '../../common/crypto.util';
import type { User } from '../../users/user.entity';
import type { Session } from './session.entity';
import { SessionsService } from './sessions.service';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const config = {
  sessionTtlDays: 30,
  browserSessionTtlHours: 24,
} as AuthConfig;

describe('SessionsService', () => {
  let repository: jest.Mocked<
    Pick<Repository<Session>, 'insert' | 'findOne' | 'update' | 'delete'>
  >;
  let service: SessionsService;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-01-01T12:00:00Z') });
    repository = {
      insert: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new SessionsService(
      repository as unknown as Repository<Session>,
      config,
    );
  });

  afterEach(() => jest.useRealTimers());

  function storedSession(overrides: Partial<Session>): Session {
    return {
      id: 'session-id',
      tokenHash: hashToken('token'),
      userId: 'user-id',
      user: { id: 'user-id' } as User,
      persistent: true,
      expiresAt: new Date(Date.now() + DAY_MS),
      lastSeenAt: new Date(),
      userAgent: null,
      ipAddress: null,
      createdAt: new Date(),
      ...overrides,
    };
  }

  it.each([
    [true, 30 * DAY_MS],
    [false, 24 * HOUR_MS],
  ])(
    'creates a session lasting according to "stay signed in" (%s)',
    async (persistent, ttl) => {
      const created = await service.create('user-id', {}, persistent);

      expect(created.persistent).toBe(persistent);
      expect(created.expiresAt.getTime()).toBe(Date.now() + ttl);
      expect(repository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          persistent,
          tokenHash: hashToken(created.token),
        }),
      );
    },
  );

  it('rejects and deletes an expired session', async () => {
    repository.findOne.mockResolvedValue(
      storedSession({ expiresAt: new Date(Date.now() - 1) }),
    );

    await expect(service.validate('token')).resolves.toBeNull();
    expect(repository.delete).toHaveBeenCalledWith({ id: 'session-id' });
  });

  it('does not extend a session used recently', async () => {
    repository.findOne.mockResolvedValue(
      storedSession({ lastSeenAt: new Date() }),
    );

    const validated = await service.validate('token');

    expect(validated?.renewed).toBe(false);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('extends a persistent session idle for more than a day', async () => {
    repository.findOne.mockResolvedValue(
      storedSession({ lastSeenAt: new Date(Date.now() - DAY_MS - 1) }),
    );

    const validated = await service.validate('token');

    expect(validated?.renewed).toBe(true);
    expect(validated?.session.expiresAt.getTime()).toBe(
      Date.now() + 30 * DAY_MS,
    );
  });

  it('extends a browser session more often, by its short lifetime', async () => {
    repository.findOne.mockResolvedValue(
      storedSession({
        persistent: false,
        lastSeenAt: new Date(Date.now() - 6 * HOUR_MS - 1),
      }),
    );

    const validated = await service.validate('token');

    expect(validated?.renewed).toBe(true);
    expect(validated?.session.expiresAt.getTime()).toBe(
      Date.now() + 24 * HOUR_MS,
    );
  });
});
