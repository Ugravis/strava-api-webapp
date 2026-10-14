import { Inject, Injectable } from '@nestjs/common';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import authConfig, { type AuthConfig } from '../config/auth.config';
import { MailService } from '../mail/mail.service';
import { AvatarsService } from '../users/avatars.service';
import type { ChangePasswordDto } from '../users/dto/change-password.dto';
import type { DeleteAccountDto } from '../users/dto/delete-account.dto';
import type { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
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
    private readonly mail: MailService,
    private readonly avatars: AvatarsService,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  async register(
    dto: RegisterDto,
    metadata: SessionMetadata,
  ): Promise<AuthResult> {
    if (await this.users.findByEmail(dto.email)) {
      throw ApiErrors.conflict(
        ApiErrorCode.EmailTaken,
        'This email is already registered',
      );
    }
    const user = await this.users.create({
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName,
      passwordHash: await this.passwordHasher.hash(dto.password),
    });
    return { user, session: await this.sessions.create(user.id, metadata) };
  }

  async login(dto: LoginDto, metadata: SessionMetadata): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    if (!user?.passwordHash) {
      await this.passwordHasher.verify(dto.password, await this.getDummyHash());
      throw this.invalidCredentials();
    }
    if (!(await this.passwordHasher.verify(dto.password, user.passwordHash))) {
      throw this.invalidCredentials();
    }
    return { user, session: await this.sessions.create(user.id, metadata) };
  }

  /** Starts a session for an already authenticated identity (e.g. OAuth). */
  async startSession(
    user: User,
    metadata: SessionMetadata,
  ): Promise<AuthResult> {
    return { user, session: await this.sessions.create(user.id, metadata) };
  }

  logout(sessionToken: string): Promise<void> {
    return this.sessions.revoke(sessionToken);
  }

  /** Always resolves, whether the account exists or not, to prevent email enumeration. */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      return;
    }
    const token = await this.tokens.issue(
      user.id,
      UserTokenPurpose.PasswordReset,
      this.config.passwordResetTtlMinutes * MINUTE_MS,
    );
    await this.mail.sendPasswordReset(
      user,
      this.frontendLink('/reset-password', token),
    );
  }

  async resetPassword(token: string, password: string): Promise<void> {
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
    await this.avatars.deleteQuietly(user.avatarKey);
    // Sessions, tokens and OAuth accounts are removed by cascade.
    await this.users.delete(user.id);
  }

  private frontendLink(path: string, token: string): string {
    const url = new URL(path, this.config.frontendUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwordHasher.hash('dummy-password-for-timing');
    return this.dummyHash;
  }

  private invalidCredentials() {
    return ApiErrors.unauthorized(
      ApiErrorCode.InvalidCredentials,
      'Invalid email or password',
    );
  }

  private invalidToken() {
    return ApiErrors.badRequest(
      ApiErrorCode.InvalidToken,
      'The link is invalid or has expired',
    );
  }
}
