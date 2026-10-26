import { IsIn, IsInt, IsObject, IsOptional, IsString } from 'class-validator';
import type { StravaWebhookObjectType } from './strava-webhook-event.entity';

/** Event pushed by Strava; field names follow the Strava payload. */
export class StravaWebhookEventDto {
  @IsIn(['activity', 'athlete'])
  object_type!: StravaWebhookObjectType;

  @IsInt()
  object_id!: number;

  @IsString()
  aspect_type!: string;

  @IsInt()
  owner_id!: number;

  @IsInt()
  subscription_id!: number;

  /** Epoch seconds. */
  @IsInt()
  event_time!: number;

  @IsOptional()
  @IsObject()
  updates?: Record<string, unknown>;
}
