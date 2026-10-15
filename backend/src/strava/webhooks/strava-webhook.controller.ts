import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../auth/decorators/public.decorator';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import stravaConfig, { type StravaConfig } from '../../config/strava.config';
import { StravaWebhookEventDto } from './strava-webhook-event.dto';
import { StravaWebhookSubscriptionService } from './strava-webhook-subscription.service';
import { StravaWebhookService } from './strava-webhook.service';

/** Callback of the Strava webhook subscription, called by Strava only. */
@Public()
@SkipThrottle()
@Controller('strava/webhook')
export class StravaWebhookController {
  constructor(
    @Inject(stravaConfig.KEY) private readonly config: StravaConfig,
    private readonly webhooks: StravaWebhookService,
    private readonly subscription: StravaWebhookSubscriptionService,
  ) {}

  /** Subscription validation: echoes the challenge when the verify token matches. */
  @Get()
  validate(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') verifyToken: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
  ): { 'hub.challenge': string } {
    if (
      mode !== 'subscribe' ||
      !challenge ||
      verifyToken !== this.config.webhookVerifyToken
    ) {
      throw ApiErrors.forbidden(
        ApiErrorCode.InvalidToken,
        'Invalid webhook verification',
      );
    }
    return { 'hub.challenge': challenge };
  }

  /** Must answer within 2 seconds: the event is stored and processed later. */
  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(@Body() event: StravaWebhookEventDto): Promise<void> {
    if (this.subscription.accepts(event.subscription_id)) {
      await this.webhooks.record(event);
    }
  }
}
