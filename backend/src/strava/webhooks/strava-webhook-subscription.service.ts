import { Inject, Injectable, Logger } from '@nestjs/common';
import { setTimeout as sleep } from 'node:timers/promises';
import stravaConfig, { type StravaConfig } from '../../config/strava.config';
import { StravaApiClient } from '../api/strava-api.client';

export const WEBHOOK_PATH = '/api/strava/webhook';
const ATTEMPTS = 6;
const RETRY_DELAY_MS = 5_000;
/** Callbacks of development quick tunnels, safe to replace when stale. */
const QUICK_TUNNEL_HOST = /\.trycloudflare\.com$/;

/**
 * Keeps the application's single Strava webhook subscription pointed at this
 * backend. Called once the HTTP server listens, because Strava validates the
 * callback while the subscription is being created.
 */
@Injectable()
export class StravaWebhookSubscriptionService {
  private readonly logger = new Logger(StravaWebhookSubscriptionService.name);
  private subscriptionId: number | null = null;

  constructor(
    @Inject(stravaConfig.KEY) private readonly config: StravaConfig,
    private readonly api: StravaApiClient,
  ) {}

  /** Events from another subscription are rejected once ours is known. */
  accepts(subscriptionId: number): boolean {
    return (
      this.subscriptionId === null || this.subscriptionId === subscriptionId
    );
  }

  async ensure(): Promise<void> {
    if (!this.api.isEnabled) {
      return;
    }
    const callbackUrl = await this.resolveCallbackUrl();
    if (!callbackUrl) {
      this.logger.log(
        'No public webhook URL configured: Strava changes are picked up by the periodic reconciliation only',
      );
      return;
    }

    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        await this.subscribe(callbackUrl);
        return;
      } catch (error) {
        this.logger.warn(
          `Strava webhook subscription attempt ${attempt}/${ATTEMPTS} failed: ${String(error)}`,
        );
        await sleep(RETRY_DELAY_MS);
      }
    }
    this.logger.error('Strava webhook subscription could not be created');
  }

  private async subscribe(callbackUrl: string): Promise<void> {
    const [current] = await this.api.listWebhookSubscriptions();
    if (current?.callback_url === callbackUrl) {
      this.subscriptionId = current.id;
      this.logger.log(
        `Strava webhook subscription ${current.id} is up to date`,
      );
      return;
    }
    if (current) {
      if (!QUICK_TUNNEL_HOST.test(new URL(current.callback_url).hostname)) {
        // Never take over a subscription that may serve another environment.
        this.logger.warn(
          `Strava webhook subscription ${current.id} points to ${current.callback_url}: delete it to use ${callbackUrl}`,
        );
        return;
      }
      await this.api.deleteWebhookSubscription(current.id);
    }
    const created = await this.api.createWebhookSubscription(
      callbackUrl,
      this.config.webhookVerifyToken,
    );
    this.subscriptionId = created.id;
    this.logger.log(
      `Strava webhook subscription ${created.id} created for ${callbackUrl}`,
    );
  }

  private async resolveCallbackUrl(): Promise<string | null> {
    if (this.config.webhookCallbackUrl) {
      return this.config.webhookCallbackUrl;
    }
    const source = this.config.webhookTunnelUrlSource;
    if (!source) {
      return null;
    }
    // The quick tunnel publishes its random hostname once it is connected.
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        const response = await fetch(source, {
          signal: AbortSignal.timeout(3_000),
        });
        const { hostname } = (await response.json()) as { hostname?: string };
        if (hostname) {
          return `https://${hostname}${WEBHOOK_PATH}`;
        }
      } catch {
        // The tunnel is not running or not ready yet.
      }
      await sleep(RETRY_DELAY_MS);
    }
    return null;
  }
}
