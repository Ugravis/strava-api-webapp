import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import authConfig, { type AuthConfig } from '../../config/auth.config';
import {
  toUserResponse,
  type UserResponse,
} from '../../users/dto/user-response';
import { Public } from '../decorators/public.decorator';
import { CompleteGoogleSignupDto } from '../dto/complete-google-signup.dto';
import { requestMetadata } from '../request-metadata';
import { SessionCookie } from '../session-cookie';
import { SignedCookie } from '../signed-cookie';
import { SensitiveThrottle } from '../throttle';
import {
  GoogleAuthService,
  type PendingGoogleSignup,
} from './google-auth.service';
import { GoogleOAuthService } from './google-oauth.service';

interface AuthorizationState {
  state: string;
  codeVerifier: string;
}

export interface PendingSignupResponse {
  email: string;
  suggestedUsername: string;
}

const COOKIE_PATH = '/api/auth/google';
const stateCookie = new SignedCookie<AuthorizationState>(
  'kilotrace_google_oauth_state',
  10 * 60 * 1000,
  COOKIE_PATH,
);
const pendingSignupCookie = new SignedCookie<PendingGoogleSignup>(
  'kilotrace_google_pending_signup',
  30 * 60 * 1000,
  COOKIE_PATH,
);

@Public()
@Controller('auth/google')
export class GoogleAuthController {
  private readonly logger = new Logger(GoogleAuthController.name);

  constructor(
    private readonly oauth: GoogleOAuthService,
    private readonly googleAuth: GoogleAuthService,
    private readonly sessionCookie: SessionCookie,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  @Get()
  async start(@Res() response: Response): Promise<void> {
    if (!this.oauth.isEnabled) {
      return this.redirectToFrontend(response, '/login?error=google_disabled');
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

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const expected = stateCookie.read(request);
    stateCookie.clear(response, this.config.secureCookies);
    if (!code || !state || !expected || expected.state !== state) {
      return this.redirectToFrontend(response, '/login?error=google');
    }

    try {
      const profile = await this.oauth.exchangeCode(
        code,
        expected.codeVerifier,
      );
      const outcome = await this.googleAuth.signIn(
        profile,
        requestMetadata(request),
      );
      if (outcome.kind === 'signup-required') {
        pendingSignupCookie.write(
          response,
          outcome.pending,
          this.config.secureCookies,
        );
        return this.redirectToFrontend(response, '/register/google');
      }
      const { session } = outcome.result;
      this.sessionCookie.write(response, session);
      return this.redirectToFrontend(response, '/dashboard');
    } catch (error) {
      this.logger.warn(
        `Google sign-in failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.redirectToFrontend(response, '/login?error=google');
    }
  }

  @Get('signup')
  async pendingSignup(@Req() request: Request): Promise<PendingSignupResponse> {
    const pending = this.requirePendingSignup(request);
    return {
      email: pending.email,
      suggestedUsername: await this.googleAuth.suggestUsername(pending),
    };
  }

  @SensitiveThrottle()
  @Post('signup')
  async completeSignup(
    @Body() dto: CompleteGoogleSignupDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponse> {
    const pending = this.requirePendingSignup(request);
    const { user, session } = await this.googleAuth.completeSignup(
      pending,
      dto,
      requestMetadata(request),
    );
    pendingSignupCookie.clear(response, this.config.secureCookies);
    this.sessionCookie.write(response, session);
    return toUserResponse(user);
  }

  private requirePendingSignup(request: Request): PendingGoogleSignup {
    const pending = pendingSignupCookie.read(request);
    if (!pending) {
      throw ApiErrors.badRequest(
        ApiErrorCode.OAuthSignupExpired,
        'The Google sign-up has expired, please start again',
      );
    }
    return pending;
  }

  private redirectToFrontend(response: Response, path: string): void {
    response.redirect(new URL(path, this.config.frontendUrl).toString());
  }
}
