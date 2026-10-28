import { Injectable } from '@nestjs/common';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { isUniqueViolation } from '../../common/database-errors';
import { SystemSettingsService } from '../../system/system-settings.service';
import { DISPLAY_NAME_MAX_LENGTH } from '../../users/dto/validation.constants';
import { normalizeEmail, UsersService } from '../../users/users.service';
import { AuthService, type AuthResult } from '../auth.service';
import type { CompleteGoogleSignupDto } from '../dto/complete-google-signup.dto';
import type { SessionMetadata } from '../sessions/sessions.service';
import type { GoogleProfile } from './google-oauth.service';
import { OAuthAccountsService } from './oauth-accounts.service';

/** Google identity waiting for the user to choose a username. */
export interface PendingGoogleSignup {
  subject: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export type GoogleSignInOutcome =
  | { kind: 'signed-in'; result: AuthResult }
  | { kind: 'signup-required'; pending: PendingGoogleSignup }
  /** A new identity while the sign-ups are closed. */
  | { kind: 'signups-closed' };

const PROVIDER = 'google';

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly users: UsersService,
    private readonly oauthAccounts: OAuthAccountsService,
    private readonly auth: AuthService,
    private readonly system: SystemSettingsService,
  ) {}

  async signIn(
    profile: GoogleProfile,
    metadata: SessionMetadata,
  ): Promise<GoogleSignInOutcome> {
    const linkedUserId = await this.oauthAccounts.findUserId(
      PROVIDER,
      profile.subject,
    );
    if (linkedUserId) {
      const user = await this.users.findById(linkedUserId);
      if (user) {
        return {
          kind: 'signed-in',
          result: await this.auth.startSession(user, metadata),
        };
      }
    }

    if (!profile.emailVerified) {
      throw ApiErrors.forbidden(
        ApiErrorCode.InvalidCredentials,
        'The Google account email is not verified',
      );
    }

    // Google verified the address: it is safe to attach this identity to the existing account.
    const existingUser = await this.users.findByEmail(profile.email);
    if (existingUser) {
      await this.oauthAccounts.link(existingUser.id, PROVIDER, profile.subject);
      await this.users.setExternalAvatarIfMissing(
        existingUser,
        profile.picture,
      );
      return {
        kind: 'signed-in',
        result: await this.auth.startSession(existingUser, metadata),
      };
    }

    if (!(await this.system.status()).signupsEnabled) {
      return { kind: 'signups-closed' };
    }
    return {
      kind: 'signup-required',
      pending: {
        subject: profile.subject,
        email: normalizeEmail(profile.email),
        name: profile.name,
        picture: profile.picture,
      },
    };
  }

  suggestUsername(pending: PendingGoogleSignup): Promise<string> {
    return this.users.suggestUsername(pending.email);
  }

  async completeSignup(
    pending: PendingGoogleSignup,
    dto: CompleteGoogleSignupDto,
    metadata: SessionMetadata,
  ): Promise<AuthResult> {
    await this.system.assertSignupsEnabled();
    const user = await this.users.create({
      email: pending.email,
      username: dto.username,
      // Taken from Google without asking: it can be changed later from the profile.
      displayName:
        pending.name?.trim().slice(0, DISPLAY_NAME_MAX_LENGTH) || null,
      externalAvatarUrl: pending.picture,
      termsAcceptedAt: new Date(),
    });
    try {
      await this.oauthAccounts.link(user.id, PROVIDER, pending.subject);
    } catch (error) {
      // Roll back the account so the identity can sign up again.
      await this.users.delete(user.id);
      if (isUniqueViolation(error, 'provider, provider_account_id')) {
        throw ApiErrors.conflict(
          ApiErrorCode.EmailTaken,
          'This Google account is already linked',
        );
      }
      throw error;
    }
    return this.auth.startSession(user, metadata);
  }
}
