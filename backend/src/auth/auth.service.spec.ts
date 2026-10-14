import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { AuthConfig } from '../config/auth.config';
import type { MailService } from '../mail/mail.service';
import type { AvatarsService } from '../users/avatars.service';
import type { User } from '../users/user.entity';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { PasswordHasher } from './password-hasher.service';
import type { SessionsService } from './sessions/sessions.service';
import { UserTokenPurpose } from './tokens/user-token.entity';
import type { UserTokensService } from './tokens/user-tokens.service';

const config: AuthConfig = {
  frontendUrl: 'http://localhost:3000',
  cookieSecret: 'secret',
  secureCookies: false,
  sessionTtlDays: 30,
  emailVerificationTtlHours: 24,
  passwordResetTtlMinutes: 60,
};

const metadata = { userAgent: 'jest', ipAddress: '127.0.0.1' };
const createdSession = {
  token: 'session-token',
  expiresAt: new Date('2030-01-01'),
};

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-id',
    email: 'jean@example.com',
    emailVerifiedAt: null,
    passwordHash: null,
    username: 'jean',
    displayName: 'Jean',
    avatarKey: null,
    externalAvatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  const passwordHasher = new PasswordHasher();
  let users: jest.Mocked<
    Pick<
      UsersService,
      | 'findByEmail'
      | 'create'
      | 'markEmailVerified'
      | 'setPasswordHash'
      | 'delete'
    >
  >;
  let sessions: jest.Mocked<
    Pick<SessionsService, 'create' | 'revoke' | 'revokeAllForUser'>
  >;
  let tokens: jest.Mocked<Pick<UserTokensService, 'issue' | 'consume'>>;
  let mail: jest.Mocked<
    Pick<MailService, 'sendEmailVerification' | 'sendPasswordReset'>
  >;
  let avatars: jest.Mocked<Pick<AvatarsService, 'deleteQuietly'>>;
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      markEmailVerified: jest.fn(),
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
    mail = { sendEmailVerification: jest.fn(), sendPasswordReset: jest.fn() };
    avatars = { deleteQuietly: jest.fn() };
    service = new AuthService(
      users as unknown as UsersService,
      sessions as unknown as SessionsService,
      tokens as unknown as UserTokensService,
      passwordHasher,
      mail as unknown as MailService,
      avatars as unknown as AvatarsService,
      config,
    );
  });

  describe('register', () => {
    const dto = {
      email: 'jean@example.com',
      password: 'a-strong-password',
      username: 'jean',
      displayName: 'Jean',
    };

    it('creates the user with a hashed password, opens a session and sends a verification email', async () => {
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
      expect(sessions.create).toHaveBeenCalledWith('user-id', metadata);
      expect(tokens.issue).toHaveBeenCalledWith(
        'user-id',
        UserTokenPurpose.EmailVerification,
        24 * 60 * 60 * 1000,
      );
      expect(mail.sendEmailVerification).toHaveBeenCalledWith(
        result.user,
        'http://localhost:3000/verify-email?token=email-token',
      );
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

  describe('email verification', () => {
    it('does not send an email to an already verified user', async () => {
      await service.sendEmailVerification(
        buildUser({ emailVerifiedAt: new Date() }),
      );

      expect(tokens.issue).not.toHaveBeenCalled();
      expect(mail.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('marks the email as verified with a valid token', async () => {
      tokens.consume.mockResolvedValue('user-id');

      await service.verifyEmail('token');

      expect(tokens.consume).toHaveBeenCalledWith(
        'token',
        UserTokenPurpose.EmailVerification,
      );
      expect(users.markEmailVerified).toHaveBeenCalledWith('user-id');
    });

    it('rejects an invalid token', async () => {
      tokens.consume.mockResolvedValue(null);

      await expect(service.verifyEmail('token')).rejects.toMatchObject({
        response: { code: 'INVALID_TOKEN' },
      });
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

    it('updates the password, verifies the email and revokes every session', async () => {
      tokens.consume.mockResolvedValue('user-id');

      await service.resetPassword('token', 'a-new-password');

      const [, passwordHash] = users.setPasswordHash.mock.calls[0];
      await expect(
        passwordHasher.verify('a-new-password', passwordHash),
      ).resolves.toBe(true);
      expect(users.markEmailVerified).toHaveBeenCalledWith('user-id');
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith('user-id');
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

    it('deletes the user and its avatar', async () => {
      const user = buildUser({ avatarKey: 'avatars/user-id/abc.webp' });

      await service.deleteAccount(user, { usernameConfirmation: 'jean' });

      expect(avatars.deleteQuietly).toHaveBeenCalledWith(
        'avatars/user-id/abc.webp',
      );
      expect(users.delete).toHaveBeenCalledWith('user-id');
    });
  });
});
