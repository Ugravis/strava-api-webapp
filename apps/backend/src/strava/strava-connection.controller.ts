import {
  Controller,
  Delete,
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
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SignedCookie } from '../auth/signed-cookie';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { generateToken } from '../common/crypto.util';
import authConfig, { type AuthConfig } from '../config/auth.config';
import { SyncJobsService } from '../connections/sync-jobs.service';
import { TilesService } from '../tiles/tiles.service';
import type { User } from '../users/user.entity';
import {
  REQUIRED_ACTIVITY_SCOPES,
  StravaApiClient,
} from './api/strava-api.client';
import {
  type StravaConnectionResponse,
  toStravaConnectionResponse,
} from './dto/strava-connection-response';
import {
  StravaAccountLinkedElsewhereError,
  StravaConnectionService,
} from './strava-connection.service';

/** Frontend pages the authorization flow may return to. */
const RETURN_PATHS = {
  dashboard: '/dashboard',
  settings: '/settings',
} as const;
type ReturnTo = keyof typeof RETURN_PATHS;

/** Outcome passed to the frontend as `?strava=<outcome>`. */
type ConnectOutcome =
  | 'connected'
  | 'denied'
  | 'missing_scope'
  | 'already_linked'
  | 'unavailable'
  | 'error';

interface AuthorizationState {
  state: string;
  userId: string;
  returnTo: ReturnTo;
}

const stateCookie = new SignedCookie<AuthorizationState>(
  'kilotrace_strava_oauth_state',
  10 * 60 * 1000,
  '/api/connections/strava',
);

@Controller('connections/strava')
export class StravaConnectionController {
  private readonly logger = new Logger(StravaConnectionController.name);

  constructor(
    private readonly api: StravaApiClient,
    private readonly connections: StravaConnectionService,
    private readonly syncJobs: SyncJobsService,
    private readonly tiles: TilesService,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  @Get()
  async status(@CurrentUser() user: User): Promise<StravaConnectionResponse> {
    const connection = await this.connections.findForUser(user.id);
    const [job, tiles] = connection
      ? await Promise.all([
          this.syncJobs.latestFor(connection.id),
          this.tiles.progress(user.id),
        ])
      : [null, null];
    return toStravaConnectionResponse(
      this.api.isEnabled,
      connection,
      job,
      tiles,
    );
  }

  /** Starts the OAuth flow: the browser navigates here, then to Strava. */
  @Get('authorize')
  authorize(
    @CurrentUser() user: User,
    @Query('from') from: string | undefined,
    @Res() response: Response,
  ): void {
    const returnTo: ReturnTo = from === 'settings' ? 'settings' : 'dashboard';
    if (!this.api.isEnabled) {
      return this.redirect(response, returnTo, 'unavailable');
    }
    const state = generateToken();
    stateCookie.write(
      response,
      { state, userId: user.id, returnTo },
      this.config.secureCookies,
    );
    response.redirect(this.api.authorizationUrl(state));
  }

  @Get('callback')
  async callback(
    @CurrentUser() user: User,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('scope') scope: string | undefined,
    @Query('error') error: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const expected = stateCookie.read(request);
    stateCookie.clear(response, this.config.secureCookies);
    const returnTo = expected?.returnTo ?? 'dashboard';
    if (!expected || expected.state !== state || expected.userId !== user.id) {
      return this.redirect(response, returnTo, 'error');
    }
    if (error) {
      return this.redirect(response, returnTo, 'denied');
    }
    // The user may uncheck scopes on the Strava consent screen.
    const scopes = (scope ?? '').split(',').filter(Boolean);
    if (!code || !scopes.some((s) => REQUIRED_ACTIVITY_SCOPES.includes(s))) {
      return this.redirect(response, returnTo, 'missing_scope');
    }

    try {
      await this.connections.connect(user.id, code, scopes);
      return this.redirect(response, returnTo, 'connected');
    } catch (failure) {
      if (failure instanceof StravaAccountLinkedElsewhereError) {
        return this.redirect(response, returnTo, 'already_linked');
      }
      this.logger.warn(`Strava connection failed: ${String(failure)}`);
      return this.redirect(response, returnTo, 'error');
    }
  }

  /** Re-reads the recent activities now, e.g. after missing webhook events. */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('sync')
  async requestSync(
    @CurrentUser() user: User,
  ): Promise<StravaConnectionResponse> {
    const connection = await this.connections.findForUser(user.id);
    if (!connection) {
      throw ApiErrors.notFound(
        ApiErrorCode.ProviderNotConnected,
        'Strava is not connected',
      );
    }
    await this.syncJobs.enqueue(
      connection.id,
      connection.lastSyncedAt ? 'reconcile' : 'backfill',
    );
    return this.status(user);
  }

  /** Revokes the access and deletes every activity imported from Strava. */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnect(@CurrentUser() user: User): Promise<void> {
    return this.connections.disconnect(user.id);
  }

  private redirect(
    response: Response,
    returnTo: ReturnTo,
    outcome: ConnectOutcome,
  ): void {
    const url = new URL(RETURN_PATHS[returnTo], this.config.frontendUrl);
    url.searchParams.set('strava', outcome);
    response.redirect(url.toString());
  }
}
