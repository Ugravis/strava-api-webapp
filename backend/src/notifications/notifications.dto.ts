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
  type NotificationCategory,
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
}
