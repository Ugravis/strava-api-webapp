import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { AuthConfig } from '../config/auth.config';
import type { MailService } from '../mail/mail.service';
import type { StravaConnectionService } from '../strava/strava-connection.service';
import type { MapPreviewService } from '../tiles/map-preview.service';
import type { AvatarsService } from '../users/avatars.service';
import type { User } from '../users/user.entity';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
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
  passwordResetTtlMinutes: 60,
};

const metadata = { userAgent: 'jest', ipAddress: '127.0.0.1' };
const createdSession = {
  token: 'session-token',
  expiresAt: new Date('2030-01-01'),
  persistent: true,
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
    termsAcceptedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  const passwordHasher = new PasswordHasher();
  let users: jest.Mocked<
    Pick<UsersService, 'findByEmail' | 'create' | 'setPasswordHash' | 'delete'>
  >;
  let sessions: jest.Mocked<
    Pick<SessionsService, 'create' | 'revoke' | 'revokeAllForUser'>
  >;
  let tokens: jest.Mocked<Pick<UserTokensService, 'issue' | 'consume'>>;
  let mail: jest.Mocked<Pick<MailService, 'sendPasswordReset'>>;
  let avatars: jest.Mocked<Pick<AvatarsService, 'deleteQuietly'>>;
  let strava: jest.Mocked<Pick<StravaConnectionService, 'disconnect'>>;
  let mapPreview: jest.Mocked<Pick<MapPreviewService, 'deleteFor'>>;
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      setPasswordHash: jest.fn(),
      delete: jest.fn(),
    };
    sessions = {
      create: jest.fn().mockResolvedValue(createdSession),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    tokens = {
      issue: jest.fn().mockResolvedValue('email-token'),
      consume: jest.fn(),
    };
    mail = { sendPasswordReset: jest.fn() };
    avatars = { deleteQuietly: jest.fn() };
    strava = { disconnect: jest.fn() };
    mapPreview = { deleteFor: jest.fn() };
    service = new AuthService(
      users as unknown as UsersService,
      sessions as unknown as SessionsService,
      tokens as unknown as UserTokensService,
      passwordHasher,
      mail as unknown as MailService,
      avatars as unknown as AvatarsService,
      strava as unknown as StravaConnectionService,
      mapPreview as unknown as MapPreviewService,
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

    it('creates the user with a hashed password, opens a session and sends no email', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockImplementation((input) =>
        Promise.resolve(
          buildUser({ passwordHash: input.passwordHash ?? null }),
        ),
      );

      const result = await service.register(dto, metadata);

      const passwordHash = users.create.mock.calls[0][0].passwordHash;
      expect(passwordHash).not.toBe(dto.password);
      await expect(
        passwordHasher.verify(dto.password, passwordHash ?? ''),
      ).resolves.toBe(true);
      expect(result.session).toBe(createdSession);
      expect(sessions.create).toHaveBeenCalledWith('user-id', metadata, true);
      expect(tokens.issue).not.toHaveBeenCalled();
    });

    it('records the acceptance of the terms and asks no display name', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue(buildUser());

      await service.register(dto, metadata);

      const input = users.create.mock.calls[0][0];
      expect(input.termsAcceptedAt).toBeInstanceOf(Date);
      expect(input.displayName).toBeUndefined();
    });

    it('rejects an email that is already registered', async () => {
      users.findByEmail.mockResolvedValue(buildUser());

      await expect(service.register(dto, metadata)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('opens a session with valid credentials', async () => {
      const user = buildUser({
        passwordHash: await passwordHasher.hash('a-strong-password'),
      });
      users.findByEmail.mockResolvedValue(user);

      const result = await service.login(
        { email: user.email, password: 'a-strong-password' },
        metadata,
      );

      expect(result).toEqual({ user, session: createdSession });
    });

    it.each([
      [true, true],
      [false, false],
      [undefined, false],
    ])(
      'opens a persistent session only when "stay signed in" is checked (%s)',
      async (rememberMe, persistent) => {
        users.findByEmail.mockResolvedValue(
          buildUser({
            passwordHash: await passwordHasher.hash('a-strong-password'),
          }),
        );

        await service.login(
          {
            email: 'jean@example.com',
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
      users.findByEmail.mockResolvedValue(
        buildUser({
          passwordHash: await passwordHasher.hash('a-strong-password'),
        }),
      );

      await expect(
        service.login(
          { email: 'jean@example.com', password: 'wrong' },
          metadata,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(sessions.create).not.toHaveBeenCalled();
    });

    it('rejects an unknown email with the same error', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'nobody@example.com', password: 'whatever' },
          metadata,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects password login on an OAuth-only account', async () => {
      users.findByEmail.mockResolvedValue(buildUser({ passwordHash: null }));

      await expect(
        service.login(
          { email: 'jean@example.com', password: 'whatever' },
          metadata,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('password reset', () => {
    it('silently ignores an unknown email', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.requestPasswordReset('nobody@example.com'),
      ).resolves.toBeUndefined();
      expect(mail.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('sends a reset link to a known email', async () => {
      const user = buildUser();
      users.findByEmail.mockResolvedValue(user);

      await service.requestPasswordReset(user.email);

      expect(mail.sendPasswordReset).toHaveBeenCalledWith(
        user,
        'http://localhost:3000/reset-password?token=email-token',
      );
    });

    it('updates the password and revokes every session', async () => {
      tokens.consume.mockResolvedValue('user-id');

      await service.resetPassword('token', 'a-new-password');

      const [, passwordHash] = users.setPasswordHash.mock.calls[0];
      await expect(
        passwordHasher.verify('a-new-password', passwordHash),
      ).resolves.toBe(true);
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith('user-id');
    });

    it('rejects an invalid reset token', async () => {
      tokens.consume.mockResolvedValue(null);

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
