import { AdminRole } from '@kilotrace/shared';
import type { Repository } from 'typeorm';
import type { GoogleProfile } from '../../auth/google/google-oauth.service';
import type { AuditLogService } from '../audit/audit-log.service';
import type { AdminSessionsService } from '../sessions/admin-sessions.service';
import type { AdminUser } from '../users/admin-user.entity';
import { AdminAuthService, SIGN_IN_ACTION } from './admin-auth.service';

describe('AdminAuthService', () => {
  let admins: jest.Mocked<Pick<Repository<AdminUser>, 'findOne'>>;
  let sessions: jest.Mocked<
    Pick<AdminSessionsService, 'create' | 'revokeAllFor'>
  >;
  let audit: jest.Mocked<Pick<AuditLogService, 'record'>>;
  let service: AdminAuthService;
  const metadata = { ipAddress: '203.0.113.7' };
  const session = { token: 'token', expiresAt: new Date() };

  beforeEach(() => {
    admins = { findOne: jest.fn() };
    sessions = {
      create: jest.fn().mockResolvedValue(session),
      revokeAllFor: jest.fn(),
    };
    audit = { record: jest.fn() };
    service = new AdminAuthService(
      admins as unknown as Repository<AdminUser>,
      sessions as unknown as AdminSessionsService,
      audit as unknown as AuditLogService,
    );
  });

  function profile(overrides: Partial<GoogleProfile> = {}): GoogleProfile {
    return {
      subject: 'google-subject',
      email: 'Boss@Example.com',
      emailVerified: true,
      name: null,
      picture: null,
      ...overrides,
    };
  }

  function account(overrides: Partial<AdminUser> = {}): AdminUser {
    return {
      id: 'admin-id',
      email: 'boss@example.com',
      role: AdminRole.Admin,
      disabledAt: null,
      ...overrides,
    } as AdminUser;
  }

  it('opens a single session for an allowlisted account, by its lowercased email', async () => {
    admins.findOne.mockResolvedValue(account());

    await expect(service.signIn(profile(), metadata)).resolves.toBe(session);

    expect(admins.findOne).toHaveBeenCalledWith({
      where: { email: 'boss@example.com' },
    });
    expect(sessions.revokeAllFor).toHaveBeenCalledWith('admin-id');
    expect(sessions.create).toHaveBeenCalledWith('admin-id', metadata);
    expect(audit.record).toHaveBeenCalledWith({
      actorId: 'admin-id',
      action: SIGN_IN_ACTION,
      targetType: 'admin-user',
      targetId: 'admin-id',
      succeeded: true,
      ipAddress: '203.0.113.7',
    });
  });

  it.each([
    ['an email outside the allowlist', null, profile()],
    ['a disabled account', account({ disabledAt: new Date() }), profile()],
    [
      'an email Google did not verify',
      account(),
      profile({ emailVerified: false }),
    ],
  ])('refuses %s and records the attempt', async (_case, stored, given) => {
    admins.findOne.mockResolvedValue(stored);

    await expect(service.signIn(given, metadata)).resolves.toBeNull();

    expect(sessions.create).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith({
      actorId: null,
      action: SIGN_IN_ACTION,
      targetType: 'email',
      targetId: 'boss@example.com',
      succeeded: false,
      ipAddress: '203.0.113.7',
    });
  });
});
