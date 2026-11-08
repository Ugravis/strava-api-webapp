import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
  type NotificationCategory,
  type NotificationType,
} from './notification.entity';

export class NotificationsPageQueryDto {
  @IsOptional()
  @IsIn(NOTIFICATION_CATEGORIES)
  category: NotificationCategory = 'all';

  /** Notifications skipped, the newest first. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}

export class MarkReadDto {
  /** Notifications to mark read; all of them when left out. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  ids?: string[];

  /** Only the notifications of this kind, e.g. the follow requests once their list is opened. */
  @IsOptional()
  @IsIn(NOTIFICATION_TYPES)
  type?: NotificationType;
}
