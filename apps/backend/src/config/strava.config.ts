import { registerAs } from '@nestjs/config';

export interface StravaConfig {
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string;
  /** Secret echoed by Strava when it validates the webhook subscription. */
  webhookVerifyToken: string;
  /** Public URL of `/api/strava/webhook`; the subscription is skipped when unknown. */
  webhookCallbackUrl: string | null;
  /** cloudflared metrics endpoint giving the hostname of a quick tunnel (development). */
  webhookTunnelUrlSource: string | null;
  /** Upper bound of activities imported by the initial synchronization; null for all. */
  syncMaxActivities: number | null;
  /** Days re-checked by the periodic reconciliation, to catch missed webhook events. */
  reconcileWindowDays: number;
  /** Minimum delay between two reconciliations of the same connection. */
  reconcileIntervalHours: number;
  workerEnabled: boolean;
  workerPollIntervalMs: number;
}

function optionalPositiveInteger(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default registerAs('strava', (): StravaConfig => {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  return {
    clientId: process.env.STRAVA_CLIENT_ID || null,
    clientSecret: process.env.STRAVA_CLIENT_SECRET || null,
    redirectUri:
      process.env.STRAVA_REDIRECT_URI ??
      `${frontendUrl}/api/connections/strava/callback`,
    webhookVerifyToken:
      process.env.STRAVA_WEBHOOK_VERIFY_TOKEN ??
      'development-webhook-verify-token',
    webhookCallbackUrl: process.env.STRAVA_WEBHOOK_CALLBACK_URL || null,
    webhookTunnelUrlSource:
      process.env.STRAVA_WEBHOOK_TUNNEL_URL_SOURCE || null,
    syncMaxActivities: optionalPositiveInteger(
      process.env.STRAVA_SYNC_MAX_ACTIVITIES,
    ),
    reconcileWindowDays:
      optionalPositiveInteger(process.env.STRAVA_RECONCILE_WINDOW_DAYS) ?? 30,
    reconcileIntervalHours:
      optionalPositiveInteger(process.env.STRAVA_RECONCILE_INTERVAL_HOURS) ?? 6,
    workerEnabled: process.env.STRAVA_WORKER_ENABLED !== 'false',
    workerPollIntervalMs: 2_000,
  };
});
