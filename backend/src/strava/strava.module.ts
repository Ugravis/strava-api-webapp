import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesModule } from '../activities/activities.module';
import { ConnectionsModule } from '../connections/connections.module';
import { StravaApiClient } from './api/strava-api.client';
import { StravaRateLimiter } from './api/strava-rate-limiter';
import { StravaConnectionController } from './strava-connection.controller';
import { StravaConnectionService } from './strava-connection.service';
import { StravaSyncService } from './sync/strava-sync.service';
import { StravaWorker } from './sync/strava-worker.service';
import { StravaWebhookEvent } from './webhooks/strava-webhook-event.entity';
import { StravaWebhookSubscriptionService } from './webhooks/strava-webhook-subscription.service';
import { StravaWebhookController } from './webhooks/strava-webhook.controller';
import { StravaWebhookService } from './webhooks/strava-webhook.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StravaWebhookEvent]),
    ActivitiesModule,
    ConnectionsModule,
  ],
  controllers: [StravaConnectionController, StravaWebhookController],
  providers: [
    // One instance: the Strava quotas are shared by the whole application.
    { provide: StravaRateLimiter, useValue: new StravaRateLimiter() },
    StravaApiClient,
    StravaConnectionService,
    StravaSyncService,
    StravaWebhookService,
    StravaWebhookSubscriptionService,
    StravaWorker,
  ],
  exports: [
    StravaConnectionService,
    StravaWebhookSubscriptionService,
    StravaRateLimiter,
  ],
})
export class StravaModule {}
