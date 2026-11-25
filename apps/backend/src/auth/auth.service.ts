import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  isCommonPassword,
  passwordContext,
  type EmailNotVerifiedError,
  type VerificationChallenge,
} from '@kilotrace/shared';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import authConfig, { type AuthConfig } from '../config/auth.config';
import { StravaConnectionService } from '../strava/strava-connection.service';
import { SystemSettingsService } from '../system/system-settings.service';
import { MapPreviewService } from '../tiles/map-preview.service';
import { AvatarsService } from '../users/avatars.service';
import type { ChangePasswordDto } from '../users/dto/change-password.dto';
import type { DeleteAccountDto } from '../users/dto/delete-account.dto';
import type { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { VerifyCodeDto } from './dto/verification.dto';
import { assertNotSuspended } from './account-suspension';
import { EmailChallengePurpose } from './challenges/email-challenge.entity';
import { EmailChallengesService } from './challenges/email-challenges.service';
import { LoginAttempts } from './login-attempts';
import { PasswordHasher } from './password-hasher.service';
import {
  type CreatedSession,
  type SessionMetadata,
  SessionsService,
} from './sessions/sessions.service';
import { UserTokenPurpose } from './tokens/user-token.entity';
import { UserTokensService } from './tokens/user-tokens.service';

export interface AuthResult {
  user: User;
  session: CreatedSession;
}

const MINUTE_MS = 60 * 1000;

@Injectable()
export class AuthService {
  /** Hash verified when the account does not exist, so response time does not reveal it. */
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
    private readonly tokens: UserTokensService,
    private readonly passwordHasher: PasswordHasher,
    private readonly challenges: EmailChallengesService,
    private readonly attempts: LoginAttempts,
    private readonly avatars: AvatarsService,
    private readonly strava: StravaConnectionService,
    private readonly mapPreview: MapPreviewService,
    private readonly system: SystemSettingsService,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  /**
   * Sends the code that creates the account once entered. An address already
   * in use is answered alike, its owner being warned by email instead.
   */
  async register(dto: RegisterDto): Promise<VerificationChallenge> {
    await this.system.assertSignupsEnabled();
    this.assertPasswordStrength(dto.password, dto.email, dto.username);
    await this.users.assertUsernameAvailable(dto.username);
    // Hashed in both cases: the response time does not tell a taken address.
    const passwordHash = await this.passwordHasher.hash(dto.password);
    const owner = await this.users.findByEmail(dto.email);
    return this.challenges.start({
      purpose: EmailChallengePurpose.Signup,
      email: dto.email,
      ...(owner
        ? { userId: owner.id }
        : { username: dto.username, passwordHash }),
    });
  }

  /** Creates the account of a sign-up whose code is entered, and signs it in. */
  async verifySignup(
    dto: VerifyCodeDto,
    metadata: SessionMetadata,
  ): Promise<AuthResult> {
    await this.system.assertSignupsEnabled();
    const challenge = await this.challenges.verify(
      dto.challengeId,
      dto.code,
      EmailChallengePurpose.Signup,
    );
    if (!challenge?.username || !challenge.passwordHash) {
      throw this.invalidCode();
    }
    const user = await this.users.create({
      email: challenge.email,
      username: challenge.username,
      passwordHash: challenge.passwordHash,
      termsAcceptedAt: new Date(),
    });
    return {
      user,
      session: await this.sessions.create(user.id, metadata, true),
    };
  }

  /** Sends another code for a sign-up or a password reset in progress. */
  resendCode(challengeId: string): Promise<VerificationChallenge> {
    return this.challenges.resend(challengeId);
  }

  async login(dto: LoginDto, metadata: SessionMetadata): Promise<AuthResult> {
    const user = await this.verifyCredentials(dto.identifier, dto.password);
    assertNotSuspended(user);
    return {
      user,
      session: await this.sessions.create(
        user.id,
        metadata,
        dto.rememberMe ?? false,
      ),
    };
  }

  /**
   * The account of an email or username and a password, else the error of
   * wrong credentials. A sign-up whose code was never entered is resumed: a
   * new code is sent and its challenge returned in the error.
   */
  async verifyCredentials(identifier: string, password: string): Promise<User> {
    const user = await this.users.findByIdentifier(identifier);
    const key = user?.id ?? identifier;
    this.attempts.assertAllowed(key);
    if (!user?.passwordHash) {
      await this.resumePendingSignup(identifier, password);
      this.attempts.recordFailure(key);
      throw this.invalidCredentials();
    }
    if (!(await this.passwordHasher.verify(password, user.passwordHash))) {
      this.attempts.recordFailure(key);
      throw this.invalidCredentials();
    }
    this.attempts.reset(key);
    if (this.passwordHasher.needsRehash(user.passwordHash)) {
      user.passwordHash = await this.passwordHasher.hash(password);
      await this.users.setPasswordHash(user.id, user.passwordHash);
    }
    return user;
  }

  /** Starts a persistent session for an already authenticated identity (e.g. OAuth). */
  async startSession(
    user: User,
    metadata: SessionMetadata,
  ): Promise<AuthResult> {
    assertNotSuspended(user);
    return {
      user,
      session: await this.sessions.create(user.id, metadata, true),
    };
  }

  logout(sessionToken: string): Promise<void> {
    return this.sessions.revoke(sessionToken);
  }

  /** Answers alike whether the account exists or not, to prevent email enumeration. */
  async requestPasswordReset(email: string): Promise<VerificationChallenge> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      return this.challenges.unknownState();
    }
    return this.challenges.start({
      purpose: EmailChallengePurpose.PasswordReset,
      email: user.email,
      userId: user.id,
    });
  }

  /** Trades a valid reset code for the short-lived token that sets the new password. */
  async verifyPasswordReset(dto: VerifyCodeDto): Promise<{ token: string }> {
    const challenge = await this.challenges.verify(
      dto.challengeId,
      dto.code,
      EmailChallengePurpose.PasswordReset,
    );
    if (!challenge?.userId) {
      throw this.invalidCode();
    }
    const token = await this.tokens.issue(
      challenge.userId,
      UserTokenPurpose.PasswordReset,
      this.config.passwordResetTtlMinutes * MINUTE_MS,
    );
    return { token };
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const ownerId = await this.tokens.ownerOf(
      token,
      UserTokenPurpose.PasswordReset,
    );
    const owner = ownerId ? await this.users.findById(ownerId) : null;
    if (!owner) {
      throw this.invalidToken();
    }
    this.assertPasswordStrength(password, owner.email, owner.username);
    const userId = await this.tokens.consume(
      token,
      UserTokenPurpose.PasswordReset,
    );
    if (!userId) {
      throw this.invalidToken();
    }
    await this.users.setPasswordHash(
      userId,
      await this.passwordHasher.hash(password),
    );
    await this.sessions.revokeAllForUser(userId);
  }

  async changePassword(
    user: User,
    currentSessionId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    if (user.passwordHash) {
      const valid =
        dto.currentPassword !== undefined &&
        (await this.passwordHasher.verify(
          dto.currentPassword,
          user.passwordHash,
        ));
      if (!valid) {
        throw ApiErrors.badRequest(
          ApiErrorCode.InvalidPassword,
          'The current password is incorrect',
        );
      }
    }
    this.assertPasswordStrength(dto.newPassword, user.email, user.username);
    await this.users.setPasswordHash(
      user.id,
      await this.passwordHasher.hash(dto.newPassword),
    );
    await this.sessions.revokeAllForUser(user.id, currentSessionId);
  }

  async deleteAccount(user: User, dto: DeleteAccountDto): Promise<void> {
    if (user.passwordHash) {
      const valid =
        dto.password !== undefined &&
        (await this.passwordHasher.verify(dto.password, user.passwordHash));
      if (!valid) {
        throw ApiErrors.badRequest(
          ApiErrorCode.InvalidPassword,
          'The password is incorrect',
        );
      }
    } else if (dto.usernameConfirmation !== user.username) {
      throw ApiErrors.badRequest(
        ApiErrorCode.ConfirmationMismatch,
        'The confirmation does not match the username',
      );
    }
    await this.purge(user);
  }

  /**
   * Deletes an account and everything tied to it, the access granted at
   * Strava included. Also run by the back office.
   */
  async purge(user: User): Promise<void> {
    await this.avatars.deleteQuietly(user.avatarKey);
    await this.mapPreview.deleteFor(user.id);
    // Revokes the access at Strava: the cascade below only removes local data.
    await this.strava.disconnect(user.id);
    // Sessions, tokens, OAuth accounts, connections and activities are removed by cascade.
    await this.users.delete(user.id);
  }

  /**
   * Resumes the sign-up of an identifier whose password matches, else spends
   * a hash as a real check would, so that the response time reveals nothing.
   */
  private async resumePendingSignup(
    identifier: string,
    password: string,
  ): Promise<void> {
    const pending = await this.challenges.findPendingSignups(identifier);
    if (pending.length === 0) {
      await this.passwordHasher.verify(password, await this.getDummyHash());
      return;
    }
    for (const signup of pending) {
      if (
        signup.passwordHash &&
        (await this.passwordHasher.verify(password, signup.passwordHash))
      ) {
        const body: EmailNotVerifiedError & { message: string } = {
          code: ApiErrorCode.EmailNotVerified,
          message: 'The email of this account is not verified yet',
          challenge: await this.challenges.resend(signup.id),
        };
        throw new ForbiddenException(body);
      }
    }
  }

  /** NIST SP 800-63B: refuses common passwords and those built on the account's own words. */
  private assertPasswordStrength(
    password: string,
    email: string,
    username: string,
  ): void {
    if (isCommonPassword(password, passwordContext(email, username))) {
      throw ApiErrors.badRequest(
        ApiErrorCode.PasswordTooCommon,
        'This password is too common or too easy to guess',
      );
    }
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwordHasher.hash('dummy-password-for-timing');
    return this.dummyHash;
  }

  private invalidCredentials() {
    return ApiErrors.unauthorized(
      ApiErrorCode.InvalidCredentials,
      'Invalid identifier or password',
    );
  }

  private invalidCode() {
    return ApiErrors.badRequest(
      ApiErrorCode.InvalidCode,
      'The code is invalid or has expired',
    );
  }

  private invalidToken() {
    return ApiErrors.badRequest(
      ApiErrorCode.InvalidToken,
      'The reset request is invalid or has expired',
    );
  }
}
