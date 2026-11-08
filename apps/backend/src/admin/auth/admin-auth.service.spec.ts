import { AdminRole } from '@kilotrace/shared/admin';
import type { AuthService } from '../../auth/auth.service';
import type { GoogleAuthService } from '../../auth/google/google-auth.service';
import type { GoogleOAuthService } from '../../auth/google/google-oauth.service';
import type { SessionsService } from '../../auth/sessions/sessions.service';
import type { AuthConfig } from '../../config/auth.config';
import type { GoogleConfig } from '../../config/google.config';
import type { User } from '../../users/user.entity';
import { AdminAuthService } from './admin-auth.service';
import { signState } from './signed-state';

const SECRET = 'cookie-secret';
const metadata = { ipAddress: '203.0.113.1' };

describe('AdminAuthService', () => {
  let auth: { verifyCredentials: jest.Mock };
  let oauth: {
    isEnabled: boolean;
    createAuthorizationRequest: jest.Mock;
    exchangeCode: jest.Mock;
  };
  let googleAuth: { findUser: jest.Mock };
  let sessions: { create: jest.Mock; revokeById: jest.Mock };
  let service: AdminAuthService;

  const user = (roles: AdminRole[], suspendedAt: Date | null = null) =>
    ({ id: 'user-id', roles, suspendedAt, suspendedUntil: null }) as User;

  beforeEach(() => {
    auth = { verifyCredentials: jest.fn() };
    oauth = {
      isEnabled: true,
      createAuthorizationRequest: jest.fn().mockResolvedValue({
        url: 'https://accounts.google.com/x',
        state: 'state',
        codeVerifier: 'verifier',
      }),
      exchangeCode: jest.fn().mockResolvedValue({ subject: 'sub' }),
    };
    googleAuth = { findUser: jest.fn() };
    sessions = {
      create: jest.fn().mockResolvedValue({
        token: 'token',
        expiresAt: new Date('2027-01-01T00:00:00Z'),
        persistent: true,
      }),
      revokeById: jest.fn(),
    };
    service = new AdminAuthService(
      auth as unknown as AuthService,
      oauth as unknown as GoogleOAuthService,
      googleAuth as unknown as GoogleAuthService,
      sessions as unknown as SessionsService,
      { cookieSecret: SECRET, emailSignInEnabled: true } as AuthConfig,
      {
        adminRedirectUri: 'https://admin.example.test/auth/google/callback',
      } as GoogleConfig,
    );
  });

  const callback = (state = 'state') => ({
    code: 'code',
    state,
    signedState: signState(
      { state: 'state', codeVerifier: 'verifier' },
      SECRET,
    ),
  });

  it('asks Google to come back to the back office', async () => {
    await service.startGoogle();
    expect(oauth.createAuthorizationRequest).toHaveBeenCalledWith(
      'https://admin.example.test/auth/google/callback',
    );
  });

  it('opens a back-office session for a member of the team', async () => {
    googleAuth.findUser.mockResolvedValue(user([AdminRole.Support]));
    await expect(service.completeGoogle(callback(), metadata)).resolves.toEqual(
      {
        token: 'token',
        expiresAt: '2027-01-01T00:00:00.000Z',
        persistent: true,
      },
    );
    expect(oauth.exchangeCode).toHaveBeenCalledWith(
      'code',
      'verifier',
      'https://admin.example.test/auth/google/callback',
    );
    expect(sessions.create).toHaveBeenCalledWith(
      'user-id',
      metadata,
      true,
      'admin',
    );
  });

  it.each([
    ['no account', null],
    ['no role', user([])],
    ['a suspended account', user([AdminRole.SuperAdmin], new Date())],
  ])(
    'refuses %s the same way, without opening a session',
    async (_case, found) => {
      googleAuth.findUser.mockResolvedValue(found);
      await expect(
        service.completeGoogle(callback(), metadata),
      ).rejects.toMatchObject({ status: 401 });
      expect(sessions.create).not.toHaveBeenCalled();
    },
  );

  it('refuses a state that does not match the one kept', async () => {
    await expect(
      service.completeGoogle(callback('other'), metadata),
    ).rejects.toMatchObject({ status: 401 });
    expect(oauth.exchangeCode).not.toHaveBeenCalled();
  });

  it('refuses a failed exchange with Google', async () => {
    oauth.exchangeCode.mockRejectedValue(new Error('invalid_grant'));
    await expect(
      service.completeGoogle(callback(), metadata),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('refuses wrong credentials like a missing role', async () => {
    auth.verifyCredentials.mockRejectedValue(new Error('wrong'));
    await expect(
      service.login('a@b.test', 'x', false, metadata),
    ).rejects.toMatchObject({ status: 401 });
    auth.verifyCredentials.mockResolvedValue(user([]));
    await expect(
      service.login('a@b.test', 'x', false, metadata),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('keeps the email sign-in closed when the site has it off', async () => {
    service = new AdminAuthService(
      auth as unknown as AuthService,
      oauth as unknown as GoogleOAuthService,
      googleAuth as unknown as GoogleAuthService,
      sessions as unknown as SessionsService,
      { cookieSecret: SECRET, emailSignInEnabled: false } as AuthConfig,
      {} as GoogleConfig,
    );
    auth.verifyCredentials.mockResolvedValue(user([AdminRole.SuperAdmin]));
    await expect(
      service.login('a@b.test', 'x', true, metadata),
    ).rejects.toMatchObject({ status: 401 });
    expect(auth.verifyCredentials).not.toHaveBeenCalled();
  });
});
