import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import { Public } from '../../auth/decorators/public.decorator';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import stravaConfig, { type StravaConfig } from '../../config/strava.config';
import { StravaWebhookEventDto } from './strava-webhook-event.dto';
import { StravaWebhookSubscriptionService } from './strava-webhook-subscription.service';
import { StravaWebhookService } from './strava-webhook.service';

/**
 * Callback of the Strava webhook subscription, called by Strava only. Events
 * are not signed: the verify token, last segment of the callback URL, keeps
 * forged events from reaching the API.
 */
@Public()
@SkipThrottle()
@Controller('strava/webhook/:token')
export class StravaWebhookController {
  constructor(
    @Inject(stravaConfig.KEY) private readonly config: StravaConfig,
    private readonly webhooks: StravaWebhookService,
    private readonly subscription: StravaWebhookSubscriptionService,
  ) {}

  /** Subscription validation: echoes the challenge when the verify token matches. */
  @Get()
  validate(
    @Param('token') token: string,
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') verifyToken: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
  ): { 'hub.challenge': string } {
    if (
      mode !== 'subscribe' ||
      !challenge ||
      !this.isVerifyToken(token) ||
      !this.isVerifyToken(verifyToken)
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
  async receive(
    @Param('token') token: string,
    @Body() event: StravaWebhookEventDto,
  ): Promise<void> {
    if (!this.isVerifyToken(token)) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'Not found');
    }
    if (this.subscription.accepts(event.subscription_id)) {
      await this.webhooks.record(event);
    }
  }

  private isVerifyToken(candidate: string | undefined): boolean {
    const expected = Buffer.from(this.config.webhookVerifyToken);
    const actual = Buffer.from(candidate ?? '');
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
