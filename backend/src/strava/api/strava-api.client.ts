import { Inject, Injectable } from '@nestjs/common';
import stravaConfig, { type StravaConfig } from '../../config/strava.config';
import {
  StravaApiError,
  StravaAuthorizationRevokedError,
  StravaRateLimitedError,
} from './strava-api.errors';
import type {
  ListActivitiesParams,
  StravaActivity,
  StravaLatLngStreams,
  StravaTokenResponse,
  StravaWebhookSubscription,
} from './strava-api.types';
import { StravaRateLimiter } from './strava-rate-limiter';

const OAUTH_BASE_URL = 'https://www.strava.com/oauth';
const API_BASE_URL = 'https://www.strava.com/api/v3';
const REQUEST_TIMEOUT_MS = 15_000;

export const STRAVA_SCOPES = ['read', 'activity:read_all'] as const;
/** Minimum scope to read activities; `activity:read_all` adds the private ones. */
export const REQUIRED_ACTIVITY_SCOPES = ['activity:read', 'activity:read_all'];

interface StravaErrorBody {
  message?: string;
  errors?: { resource?: string; field?: string; code?: string }[];
}

/** Thin typed client of the Strava API v3, aware of the rate limits. */
@Injectable()
export class StravaApiClient {
  constructor(
    @Inject(stravaConfig.KEY) private readonly config: StravaConfig,
    private readonly rateLimiter: StravaRateLimiter,
  ) {}

  get isEnabled(): boolean {
    return this.config.clientId !== null && this.config.clientSecret !== null;
  }

  authorizationUrl(state: string): string {
    const url = new URL(`${OAUTH_BASE_URL}/authorize`);
    url.search = new URLSearchParams({
      client_id: this.credentials().clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: STRAVA_SCOPES.join(','),
      state,
    }).toString();
    return url.toString();
  }

  exchangeCode(code: string): Promise<StravaTokenResponse> {
    return this.tokenRequest({ grant_type: 'authorization_code', code });
  }

  /** May return a new refresh token: the previous one is then invalid. */
  async refreshToken(refreshToken: string): Promise<StravaTokenResponse> {
    try {
      return await this.tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });
    } catch (error) {
      if (error instanceof StravaRefreshTokenRejected) {
        throw new StravaAuthorizationRevokedError();
      }
      throw error;
    }
  }

  /** Revokes the token pair at Strava. Succeeds even if the token is unknown. */
  async revoke(token: string): Promise<void> {
    const { clientId, clientSecret } = this.credentials();
    const response = await fetch(`${OAUTH_BASE_URL}/revoke`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ token, token_type_hint: 'refresh_token' }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw await this.toError(response);
    }
  }

  /** Activities of the athlete, most recent first. */
  listActivities(
    accessToken: string,
    { page, perPage, after }: ListActivitiesParams,
  ): Promise<StravaActivity[]> {
    const query: Record<string, string> = {
      page: String(page),
      per_page: String(perPage),
    };
    if (after) {
      query.after = String(Math.floor(after.getTime() / 1000));
    }
    return this.apiRequest<StravaActivity[]>(
      accessToken,
      '/athlete/activities',
      query,
    );
  }

  getActivity(accessToken: string, id: string): Promise<StravaActivity> {
    return this.apiRequest<StravaActivity>(
      accessToken,
      `/activities/${encodeURIComponent(id)}`,
    );
  }

  /** Full GPS track, or null when the activity has none. */
  async getLatLngStream(
    accessToken: string,
    id: string,
  ): Promise<[number, number][] | null> {
    const streams = await this.apiRequest<StravaLatLngStreams>(
      accessToken,
      `/activities/${encodeURIComponent(id)}/streams`,
      { keys: 'latlng', key_by_type: 'true' },
    );
    const points = streams.latlng?.data;
    return points && points.length > 0 ? points : null;
  }

  async listWebhookSubscriptions(): Promise<StravaWebhookSubscription[]> {
    const { clientId, clientSecret } = this.credentials();
    const url = new URL(`${API_BASE_URL}/push_subscriptions`);
    url.search = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
    }).toString();
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw await this.toError(response);
    }
    return (await response.json()) as StravaWebhookSubscription[];
  }

  /** Strava validates the callback (`hub.challenge`) before answering. */
  async createWebhookSubscription(
    callbackUrl: string,
    verifyToken: string,
  ): Promise<StravaWebhookSubscription> {
    const { clientId, clientSecret } = this.credentials();
    const response = await fetch(`${API_BASE_URL}/push_subscriptions`, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        callback_url: callbackUrl,
        verify_token: verifyToken,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw await this.toError(response);
    }
    return (await response.json()) as StravaWebhookSubscription;
  }

  async deleteWebhookSubscription(id: number): Promise<void> {
    const { clientId, clientSecret } = this.credentials();
    const url = new URL(`${API_BASE_URL}/push_subscriptions/${id}`);
    url.search = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
    }).toString();
    const response = await fetch(url, {
      method: 'DELETE',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw await this.toError(response);
    }
  }

  private async tokenRequest(
    grant: Record<string, string>,
  ): Promise<StravaTokenResponse> {
    const { clientId, clientSecret } = this.credentials();
    const response = await fetch(`${OAUTH_BASE_URL}/token`, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        ...grant,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw await this.toError(response);
    }
    return (await response.json()) as StravaTokenResponse;
  }

  private async apiRequest<T>(
    accessToken: string,
    path: string,
    query: Record<string, string> = {},
  ): Promise<T> {
    const blockedUntil = this.rateLimiter.blockedUntil();
    if (blockedUntil) {
      throw new StravaRateLimitedError(blockedUntil);
    }
    const url = new URL(`${API_BASE_URL}${path}`);
    url.search = new URLSearchParams(query).toString();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    this.rateLimiter.record(response.headers);
    if (response.status === 429) {
      throw new StravaRateLimitedError(this.rateLimiter.retryAfterRejection());
    }
    if (!response.ok) {
      throw await this.toError(response);
    }
    return (await response.json()) as T;
  }

  private async toError(response: Response): Promise<Error> {
    const body = (await response
      .json()
      .catch(() => null)) as StravaErrorBody | null;
    const rejectsRefreshToken = body?.errors?.some(
      (error) =>
        error.field === 'refresh_token' || error.resource === 'RefreshToken',
    );
    if (response.status < 500 && rejectsRefreshToken) {
      return new StravaRefreshTokenRejected();
    }
    const details = body?.errors
      ?.map((error) => `${error.resource}.${error.field}: ${error.code}`)
      .join(', ');
    return new StravaApiError(
      response.status,
      `Strava API ${response.status}: ${body?.message ?? response.statusText}${details ? ` (${details})` : ''}`,
    );
  }

  private credentials(): { clientId: string; clientSecret: string } {
    const { clientId, clientSecret } = this.config;
    if (!clientId || !clientSecret) {
      throw new Error('Strava is not configured');
    }
    return { clientId, clientSecret };
  }
}

class StravaRefreshTokenRejected extends Error {}
