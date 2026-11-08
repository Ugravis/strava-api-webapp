import {
  type AdminGoogleAuthorization,
  type AdminSessionResponse,
  highestAdminRole,
} from '@kilotrace/shared/admin';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { GoogleAuthService } from '../../auth/google/google-auth.service';
import { GoogleOAuthService } from '../../auth/google/google-oauth.service';
import { isSuspended, type User } from '../../users/user.entity';
import {
  type SessionMetadata,
  SessionsService,
} from '../../auth/sessions/sessions.service';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import authConfig, { type AuthConfig } from '../../config/auth.config';
import googleConfig, { type GoogleConfig } from '../../config/google.config';
import type { AdminGoogleCallbackDto } from './admin-google-callback.dto';
import { signState, verifyState } from './signed-state';

interface GoogleState {
  state: string;
  codeVerifier: string;
}

/**
 * Sign-in of the back office, on its own host: only an existing account
 * holding a back-office role gets a session, of the `admin` kind. Any
 * refusal is the same, whatever its reason, and nothing is ever created.
 */
@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly auth: AuthService,
    private readonly oauth: GoogleOAuthService,
    private readonly googleAuth: GoogleAuthService,
    private readonly sessions: SessionsService,
    @Inject(authConfig.KEY) private readonly authSettings: AuthConfig,
    @Inject(googleConfig.KEY) private readonly google: GoogleConfig,
  ) {}

  providers(): { google: boolean; email: boolean } {
    return {
      google: this.oauth.isEnabled,
      email: this.authSettings.emailSignInEnabled,
    };
  }

  async startGoogle(): Promise<AdminGoogleAuthorization> {
    if (!this.oauth.isEnabled) {
      throw refused();
    }
    const { url, state, codeVerifier } =
      await this.oauth.createAuthorizationRequest(this.google.adminRedirectUri);
    return {
      url,
      state: signState<GoogleState>(
        { state, codeVerifier },
        this.authSettings.cookieSecret,
      ),
    };
  }

  async completeGoogle(
    dto: AdminGoogleCallbackDto,
    metadata: SessionMetadata,
  ): Promise<AdminSessionResponse> {
    const expected = verifyState<GoogleState>(
      dto.signedState,
      this.authSettings.cookieSecret,
    );
    if (!this.oauth.isEnabled || !expected || expected.state !== dto.state) {
      throw refused();
    }
    let user: User | null;
    try {
      const profile = await this.oauth.exchangeCode(
        dto.code,
        expected.codeVerifier,
        this.google.adminRedirectUri,
      );
      user = await this.googleAuth.findUser(profile);
    } catch (error) {
      this.logger.warn(
        `Back-office Google sign-in failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw refused();
    }
    return this.open(user, metadata, true);
  }

  async login(
    email: string,
    password: string,
    persistent: boolean,
    metadata: SessionMetadata,
  ): Promise<AdminSessionResponse> {
    if (!this.authSettings.emailSignInEnabled) {
      throw refused();
    }
    const user = await this.auth
      .verifyCredentials(email, password)
      .catch(() => null);
    return this.open(user, metadata, persistent);
  }

  logout(sessionId: string): Promise<void> {
    return this.sessions.revokeById(sessionId);
  }

  private async open(
    user: User | null,
    metadata: SessionMetadata,
    persistent: boolean,
  ): Promise<AdminSessionResponse> {
    if (!user || isSuspended(user) || !highestAdminRole(user.roles)) {
      throw refused();
    }
    const session = await this.sessions.create(
      user.id,
      metadata,
      persistent,
      'admin',
    );
    return {
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      persistent: session.persistent,
    };
  }
}

/** The single refusal of the sign-in, which tells nothing of its reason. */
function refused() {
  return ApiErrors.unauthorized(
    ApiErrorCode.InvalidCredentials,
    'Sign-in refused',
  );
}
