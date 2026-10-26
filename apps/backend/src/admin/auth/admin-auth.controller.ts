import { AdminRole } from '@kilotrace/shared';
import {
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { GoogleOAuthService } from '../../auth/google/google-oauth.service';
import { requestMetadata } from '../../auth/request-metadata';
import { SignedCookie } from '../../auth/signed-cookie';
import { SensitiveThrottle } from '../../auth/throttle';
import adminAuthConfig, {
  type AdminAuthConfig,
} from '../../config/admin-auth.config';
import {
  clearAdminSessionCookie,
  readAdminSessionCookie,
  writeAdminSessionCookie,
} from '../admin-session-cookie';
import { Audited } from '../audit/audited.decorator';
import { AdminController } from '../decorators/admin-controller.decorator';
import { AdminPublic } from '../decorators/admin-public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { AdminSessionsService } from '../sessions/admin-sessions.service';
import { AdminAuthService } from './admin-auth.service';

/** Injection token of the Google client dedicated to the back office. */
export const ADMIN_GOOGLE_OAUTH = Symbol('ADMIN_GOOGLE_OAUTH');

interface AuthorizationState {
  state: string;
  codeVerifier: string;
}

const stateCookie = new SignedCookie<AuthorizationState>(
  'kilotrace_admin_oauth_state',
  10 * 60 * 1000,
  '/api/admin/auth/google',
);

@AdminController('auth')
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);

  constructor(
    @Inject(ADMIN_GOOGLE_OAUTH) private readonly oauth: GoogleOAuthService,
    private readonly adminAuth: AdminAuthService,
    private readonly sessions: AdminSessionsService,
    @Inject(adminAuthConfig.KEY) private readonly config: AdminAuthConfig,
  ) {}

  @AdminPublic()
  @SensitiveThrottle()
  @Get('google')
  async start(@Res() response: Response): Promise<void> {
    if (!this.oauth.isEnabled) {
      return this.redirect(response, '/login?error=google_disabled');
    }
    const { url, state, codeVerifier } =
      await this.oauth.createAuthorizationRequest();
    stateCookie.write(
      response,
      { state, codeVerifier },
      this.config.secureCookies,
    );
    response.redirect(url);
  }

  @AdminPublic()
  @SensitiveThrottle()
  @Get('google/callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const expected = stateCookie.read(request);
    stateCookie.clear(response, this.config.secureCookies);
    if (!code || !state || !expected || expected.state !== state) {
      return this.redirect(response, '/login?error=google');
    }

    try {
      const profile = await this.oauth.exchangeCode(
        code,
        expected.codeVerifier,
      );
      const session = await this.adminAuth.signIn(
        profile,
        requestMetadata(request),
      );
      if (!session) {
        return this.redirect(response, '/login?error=not_allowed');
      }
      writeAdminSessionCookie(
        response,
        session.token,
        this.config.secureCookies,
      );
      return this.redirect(response, '/');
    } catch (error) {
      this.logger.warn(
        `Back-office sign-in failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.redirect(response, '/login?error=google');
    }
  }

  @Roles(AdminRole.Support)
  @Audited({ action: 'admin-auth.sign-out' })
  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOut(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = readAdminSessionCookie(request);
    if (token) {
      await this.sessions.revoke(token);
    }
    clearAdminSessionCookie(response, this.config.secureCookies);
  }

  private redirect(response: Response, path: string): void {
    response.redirect(new URL(path, this.config.adminUrl).toString());
  }
}
