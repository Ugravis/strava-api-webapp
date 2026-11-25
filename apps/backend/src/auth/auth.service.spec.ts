import {
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthConfig } from '../config/auth.config';
import type { StravaConnectionService } from '../strava/strava-connection.service';
import type { SystemSettingsService } from '../system/system-settings.service';
import type { MapPreviewService } from '../tiles/map-preview.service';
import type { AvatarsService } from '../users/avatars.service';
import type { User } from '../users/user.entity';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import {
  EmailChallengePurpose,
  type EmailChallenge,
} from './challenges/email-challenge.entity';
import type { EmailChallengesService } from './challenges/email-challenges.service';
import { LoginAttempts } from './login-attempts';
import { PasswordHasher } from './password-hasher.service';
import type { SessionsService } from './sessions/sessions.service';
import type { UserTokensService } from './tokens/user-tokens.service';

const config: AuthConfig = {
  frontendUrl: 'http://localhost:3000',
  cookieSecret: 'secret',
  encryptionSecret: 'encryption-secret',
  secureCookies: false,
  emailSignInEnabled: true,
  sessionTtlDays: 30,
  browserSessionTtlHours: 24,
  passwordResetTtlMinutes: 15,
};

const metadata = { userAgent: 'jest', ipAddress: '127.0.0.1' };
const createdSession = {
  token: 'session-token',
  expiresAt: new Date('2030-01-01'),
  persistent: true,
};
const challengeState = {
  challengeId: '00000000-0000-4000-8000-000000000001',
  resendAvailableAt: '2030-01-01T00:00:30.000Z',
};

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-id',
    email: 'jean@example.com',
    passwordHash: null,
    username: 'jean',
    displayName: 'Jean',
    avatarKey: null,
    externalAvatarUrl: null,
    bio: null,
    city: null,
    countryCode: null,
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

function buildChallenge(
  overrides: Partial<EmailChallenge> = {},
): EmailChallenge {
  return {
    id: challengeState.challengeId,
    purpose: EmailChallengePurpose.Signup,
    email: 'jean@example.com',
    userId: null,
    username: 'jean',
    passwordHash: 'hash',
    codes: [],
    failedAttempts: 0,
    sendCount: 1,
    sendWindowStartedAt: new Date(),
    lastSentAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  const passwordHasher = new PasswordHasher();
  let users: jest.Mocked<
    Pick<
      UsersService,
      | 'findByEmail'
      | 'findByIdentifier'
      | 'findById'
      | 'create'
      | 'setPasswordHash'
      | 'delete'
      | 'assertUsernameAvailable'
    >
  >;
  let sessions: jest.Mocked<
    Pick<SessionsService, 'create' | 'revoke' | 'revokeAllForUser'>
  >;
  let tokens: jest.Mocked<
    Pick<UserTokensService, 'issue' | 'consume' | 'ownerOf'>
  >;
  let challenges: jest.Mocked<
    Pick<
      EmailChallengesService,
      'start' | 'resend' | 'verify' | 'unknownState' | 'findPendingSignups'
    >
  >;
  let avatars: jest.Mocked<Pick<AvatarsService, 'deleteQuietly'>>;
  let strava: jest.Mocked<Pick<StravaConnectionService, 'disconnect'>>;
  let mapPreview: jest.Mocked<Pick<MapPreviewService, 'deleteFor'>>;
  let system: jest.Mocked<Pick<SystemSettingsService, 'assertSignupsEnabled'>>;
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findByIdentifier: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      setPasswordHash: jest.fn(),
      delete: jest.fn(),
      assertUsernameAvailable: jest.fn(),
    };
    sessions = {
      create: jest.fn().mockResolvedValue(createdSession),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    tokens = {
      issue: jest.fn().mockResolvedValue('reset-token'),
      consume: jest.fn(),
      ownerOf: jest.fn(),
    };
    challenges = {
      start: jest.fn().mockResolvedValue(challengeState),
      resend: jest.fn().mockResolvedValue(challengeState),
      verify: jest.fn(),
      unknownState: jest.fn().mockReturnValue(challengeState),
      findPendingSignups: jest.fn().mockResolvedValue([]),
    };
    avatars = { deleteQuietly: jest.fn() };
    strava = { disconnect: jest.fn() };
    mapPreview = { deleteFor: jest.fn() };
    system = { assertSignupsEnabled: jest.fn() };
    service = new AuthService(
      users as unknown as UsersService,
      sessions as unknown as SessionsService,
      tokens as unknown as UserTokensService,
      passwordHasher,
      challenges as unknown as EmailChallengesService,
      new LoginAttempts(),
      avatars as unknown as AvatarsService,
      strava as unknown as StravaConnectionService,
      mapPreview as unknown as MapPreviewService,
      system as unknown as SystemSettingsService,
      config,
    );
  });

  describe('register', () => {
    const dto = {
      email: 'jean@example.com',
      password: 'a-strong-password',
      username: 'jean',
      acceptTerms: true,
    };

    it('creates no account but sends a code for the sign-up, its password hashed', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(service.register(dto)).resolves.toBe(challengeState);

      expect(users.create).not.toHaveBeenCalled();
      const input = challenges.start.mock.calls[0][0];
      expect(input).toMatchObject({
        purpose: EmailChallengePurpose.Signup,
        email: dto.email,
        username: dto.username,
      });
      await expect(
        passwordHasher.verify(dto.password, input.passwordHash ?? ''),
      ).resolves.toBe(true);
    });

    it('answers alike for an address already in use, its owner being warned', async () => {
      users.findByEmail.mockResolvedValue(buildUser());

      await expect(service.register(dto)).resolves.toBe(challengeState);

      expect(challenges.start).toHaveBeenCalledWith({
        purpose: EmailChallengePurpose.Signup,
        email: dto.email,
        userId: 'user-id',
      });
    });

    it('sends nothing while the sign-ups are closed', async () => {
      system.assertSignupsEnabled.mockRejectedValue(new ForbiddenException());

      await expect(service.register(dto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(challenges.start).not.toHaveBeenCalled();
    });

    it.each(['password123', 'Azerty2024!', 'jean2024jean', '11111111'])(
      'refuses the common password %s',
      async (password) => {
        await expect(
          service.register({ ...dto, password }),
        ).rejects.toMatchObject({ response: { code: 'PASSWORD_TOO_COMMON' } });
        expect(challenges.start).not.toHaveBeenCalled();
      },
    );
  });

  describe('verifySignup', () => {
    const dto = { challengeId: challengeState.challengeId, code: '123456' };

    it('creates the account of a valid code and signs it in', async () => {
      challenges.verify.mockResolvedValue(buildChallenge());
      users.create.mockResolvedValue(buildUser());

      const result = await service.verifySignup(dto, metadata);

      expect(users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jean@example.com',
          username: 'jean',
          passwordHash: 'hash',
          termsAcceptedAt: expect.any(Date) as Date,
        }),
      );
      expect(result.session).toBe(createdSession);
      expect(sessions.create).toHaveBeenCalledWith('user-id', metadata, true);
    });

    it('refuses a wrong code', async () => {
      challenges.verify.mockResolvedValue(null);

      await expect(service.verifySignup(dto, metadata)).rejects.toMatchObject({
        response: { code: 'INVALID_CODE' },
      });
      expect(users.create).not.toHaveBeenCalled();
    });

    it('never creates an account from the warning of an address in use', async () => {
      challenges.verify.mockResolvedValue(
        buildChallenge({
          userId: 'user-id',
          username: null,
          passwordHash: null,
        }),
      );

      await expect(service.verifySignup(dto, metadata)).rejects.toMatchObject({
        response: { code: 'INVALID_CODE' },
      });
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('opens a session with valid credentials, by email or username', async () => {
      const user = buildUser({
        passwordHash: await passwordHasher.hash('a-strong-password'),
      });
      users.findByIdentifier.mockResolvedValue(user);

      const result = await service.login(
        { identifier: 'jean', password: 'a-strong-password' },
        metadata,
      );

      expect(users.findByIdentifier).toHaveBeenCalledWith('jean');
      expect(result).toEqual({ user, session: createdSession });
    });

    it.each([
      [true, true],
      [false, false],
      [undefined, false],
    ])(
      'opens a persistent session only when "stay signed in" is checked (%s)',
      async (rememberMe, persistent) => {
        users.findByIdentifier.mockResolvedValue(
          buildUser({
            passwordHash: await passwordHasher.hash('a-strong-password'),
          }),
        );

        await service.login(
          {
            identifier: 'jean@example.com',
            password: 'a-strong-password',
            rememberMe,
          },
          metadata,
        );

        expect(sessions.create).toHaveBeenCalledWith(
          'user-id',
          metadata,
          persistent,
        );
      },
    );

    it('rejects a wrong password', async () => {
      users.findByIdentifier.mockResolvedValue(
        buildUser({
          passwordHash: await passwordHasher.hash('a-strong-password'),
        }),
      );

      await expect(
        service.login(
          { identifier: 'jean@example.com', password: 'wrong' },
          metadata,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(sessions.create).not.toHaveBeenCalled();
    });

    it('rejects an unknown identifier with the same error', async () => {
      users.findByIdentifier.mockResolvedValue(null);

      await expect(
        service.login(
          { identifier: 'nobody@example.com', password: 'whatever' },
          metadata,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects password login on an OAuth-only account', async () => {
      users.findByIdentifier.mockResolvedValue(
        buildUser({ passwordHash: null }),
      );

      await expect(
        service.login(
          { identifier: 'jean@example.com', password: 'whatever' },
          metadata,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('resumes a sign-up whose code was never entered', async () => {
      users.findByIdentifier.mockResolvedValue(null);
      challenges.findPendingSignups.mockResolvedValue([
        buildChallenge({
          passwordHash: await passwordHasher.hash('a-strong-password'),
        }),
      ]);

      await expect(
        service.login(
          { identifier: 'jean', password: 'a-strong-password' },
          metadata,
        ),
      ).rejects.toMatchObject({
        response: { code: 'EMAIL_NOT_VERIFIED', challenge: challengeState },
      });
      expect(challenges.resend).toHaveBeenCalledWith(
        challengeState.challengeId,
      );
    });

    it('does not resume a waiting sign-up with a wrong password', async () => {
      users.findByIdentifier.mockResolvedValue(null);
      challenges.findPendingSignups.mockResolvedValue([
        buildChallenge({
          passwordHash: await passwordHasher.hash('a-strong-password'),
        }),
      ]);

      await expect(
        service.login({ identifier: 'jean', password: 'wrong' }, metadata),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(challenges.resend).not.toHaveBeenCalled();
    });

    it('locks an identifier after 10 failures, known or not', async () => {
      users.findByIdentifier.mockResolvedValue(null);
      for (let attempt = 0; attempt < 10; attempt++) {
        await expect(
          service.login({ identifier: 'nobody', password: 'x' }, metadata),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }

      await expect(
        service.login({ identifier: 'nobody', password: 'x' }, metadata),
      ).rejects.toBeInstanceOf(HttpException);
      await expect(
        service.login({ identifier: 'nobody', password: 'x' }, metadata),
      ).rejects.toMatchObject({ response: { code: 'TOO_MANY_ATTEMPTS' } });
    }, 30_000);

    it('rehashes a password hashed with older parameters', async () => {
      const legacy =
        'scrypt$32768$8$1$c2FsdHNhbHRzYWx0c2FsdA==$' + 'placeholder';
      users.findByIdentifier.mockResolvedValue(
        buildUser({ passwordHash: legacy }),
      );
      jest.spyOn(passwordHasher, 'verify').mockResolvedValueOnce(true);

      await service.login(
        { identifier: 'jean', password: 'a-strong-password' },
        metadata,
      );

      const [, passwordHash] = users.setPasswordHash.mock.calls[0];
      expect(passwordHasher.needsRehash(passwordHash)).toBe(false);
    });
  });

  describe('password reset', () => {
    it('answers alike for an unknown email, sending nothing', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.requestPasswordReset('nobody@example.com'),
      ).resolves.toBe(challengeState);
      expect(challenges.start).not.toHaveBeenCalled();
    });

    it('sends a code to a known email', async () => {
      const user = buildUser();
      users.findByEmail.mockResolvedValue(user);

      await service.requestPasswordReset(user.email);

      expect(challenges.start).toHaveBeenCalledWith({
        purpose: EmailChallengePurpose.PasswordReset,
        email: user.email,
        userId: user.id,
      });
    });

    it('trades a valid code for a reset token', async () => {
      challenges.verify.mockResolvedValue(
        buildChallenge({
          purpose: EmailChallengePurpose.PasswordReset,
          userId: 'user-id',
        }),
      );

      await expect(
        service.verifyPasswordReset({
          challengeId: challengeState.challengeId,
          code: '123456',
        }),
      ).resolves.toEqual({ token: 'reset-token' });
    });

    it('refuses a wrong reset code', async () => {
      challenges.verify.mockResolvedValue(null);

      await expect(
        service.verifyPasswordReset({
          challengeId: challengeState.challengeId,
          code: '123456',
        }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_CODE' } });
      expect(tokens.issue).not.toHaveBeenCalled();
    });

    it('updates the password and revokes every session', async () => {
      tokens.ownerOf.mockResolvedValue('user-id');
      users.findById.mockResolvedValue(buildUser());
      tokens.consume.mockResolvedValue('user-id');

      await service.resetPassword('token', 'a-new-password');

      const [, passwordHash] = users.setPasswordHash.mock.calls[0];
      await expect(
        passwordHasher.verify('a-new-password', passwordHash),
      ).resolves.toBe(true);
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith('user-id');
    });

    it('rejects an invalid reset token', async () => {
      tokens.ownerOf.mockResolvedValue(null);

      await expect(
        service.resetPassword('token', 'a-new-password'),
      ).rejects.toMatchObject({ response: { code: 'INVALID_TOKEN' } });
      expect(users.setPasswordHash).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('requires the current password when one is set', async () => {
      const user = buildUser({
        passwordHash: await passwordHasher.hash('current-password'),
      });

      await expect(
        service.changePassword(user, 'session-id', {
          currentPassword: 'wrong',
          newPassword: 'a-new-password',
        }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_PASSWORD' } });
      expect(users.setPasswordHash).not.toHaveBeenCalled();
    });

    it('changes the password and keeps only the current session', async () => {
      const user = buildUser({
        passwordHash: await passwordHasher.hash('current-password'),
      });

      await service.changePassword(user, 'session-id', {
        currentPassword: 'current-password',
        newPassword: 'a-new-password',
      });

      expect(users.setPasswordHash).toHaveBeenCalled();
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith(
        'user-id',
        'session-id',
      );
    });

    it('lets an OAuth-only account define a first password', async () => {
      await service.changePassword(buildUser(), 'session-id', {
        newPassword: 'a-new-password',
      });

      expect(users.setPasswordHash).toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    it('requires the password when one is set', async () => {
      const user = buildUser({
        passwordHash: await passwordHasher.hash('current-password'),
      });

      await expect(
        service.deleteAccount(user, { password: 'wrong' }),
      ).rejects.toMatchObject({
        response: { code: 'INVALID_PASSWORD' },
      });
      expect(users.delete).not.toHaveBeenCalled();
    });

    it('requires the username for an OAuth-only account', async () => {
      await expect(
        service.deleteAccount(buildUser(), { usernameConfirmation: 'other' }),
      ).rejects.toMatchObject({ response: { code: 'CONFIRMATION_MISMATCH' } });
    });

    it('deletes the user, its avatar and its map preview', async () => {
      const user = buildUser({ avatarKey: 'avatars/user-id/abc.webp' });

      await service.deleteAccount(user, { usernameConfirmation: 'jean' });

      expect(avatars.deleteQuietly).toHaveBeenCalledWith(
        'avatars/user-id/abc.webp',
      );
      expect(mapPreview.deleteFor).toHaveBeenCalledWith('user-id');
      expect(strava.disconnect).toHaveBeenCalledWith('user-id');
      expect(users.delete).toHaveBeenCalledWith('user-id');
    });
  });
});
