import { Inject, Injectable } from '@nestjs/common';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'node:crypto';
import googleConfig, { type GoogleConfig } from '../../config/google.config';

export interface GoogleAuthorizationRequest {
  url: string;
  state: string;
  codeVerifier: string;
}

export interface GoogleProfile {
  subject: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

/** Google sign-in through the OAuth 2.0 authorization code flow with PKCE. */
@Injectable()
export class GoogleOAuthService {
  private readonly client: OAuth2Client | null;

  constructor(@Inject(googleConfig.KEY) private readonly config: GoogleConfig) {
    this.client =
      config.clientId && config.clientSecret
        ? new OAuth2Client({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            redirectUri: config.redirectUri,
          })
        : null;
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  /** `redirectUri`: the callback of another host of the same client, e.g. the back office. */
  async createAuthorizationRequest(
    redirectUri?: string,
  ): Promise<GoogleAuthorizationRequest> {
    const client = this.requireClient();
    const { codeVerifier, codeChallenge } =
      await client.generateCodeVerifierAsync();
    const state = randomBytes(16).toString('base64url');
    const url = client.generateAuthUrl({
      scope: ['openid', 'email', 'profile'],
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
      prompt: 'select_account',
      ...(redirectUri && { redirect_uri: redirectUri }),
    });
    return { url, state, codeVerifier };
  }

  /** `redirectUri`: the one of the authorization request, when not the default. */
  async exchangeCode(
    code: string,
    codeVerifier: string,
    redirectUri?: string,
  ): Promise<GoogleProfile> {
    const client = this.requireClient();
    const { tokens } = await client.getToken({
      code,
      codeVerifier,
      ...(redirectUri && { redirect_uri: redirectUri }),
    });
    if (!tokens.id_token) {
      throw new Error('Google did not return an ID token');
    }
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.config.clientId ?? undefined,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error('Google ID token is missing required claims');
    }
    return {
      subject: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? null,
      picture: payload.picture ?? null,
    };
  }

  private requireClient(): OAuth2Client {
    if (!this.client) {
      throw new Error('Google sign-in is not configured');
    }
    return this.client;
  }
}
