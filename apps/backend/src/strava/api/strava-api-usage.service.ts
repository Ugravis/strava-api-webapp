import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StravaApiUsage } from './strava-api-usage.entity';
import { quarterStart, type StravaRateLimiter } from './strava-rate-limiter';

/**
 * History of the Strava quotas, for the statistics of the back office: the
 * rate limiter only keeps the last response in memory.
 */
@Injectable()
export class StravaApiUsageService {
  private readonly logger = new Logger(StravaApiUsageService.name);

  constructor(
    @InjectRepository(StravaApiUsage)
    private readonly usage: Repository<StravaApiUsage>,
  ) {}

  /**
   * Keeps the highest usage of the quarter. Never throws: a failed write
   * must not fail the Strava call it follows.
   */
  async record(
    snapshot: ReturnType<StravaRateLimiter['snapshot']>,
  ): Promise<void> {
    const { observedAt, overall, read } = snapshot;
    if (!observedAt) {
      return;
    }
    try {
      await this.usage.query(
        `INSERT INTO "strava_api_usage" AS u ("window_start", "short_usage", "short_limit", "daily_usage", "daily_limit",
           "read_short_usage", "read_short_limit", "read_daily_usage", "read_daily_limit")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT ("window_start") DO UPDATE SET
           "short_usage" = GREATEST(u."short_usage", EXCLUDED."short_usage"),
           "short_limit" = COALESCE(EXCLUDED."short_limit", u."short_limit"),
           "daily_usage" = GREATEST(u."daily_usage", EXCLUDED."daily_usage"),
           "daily_limit" = COALESCE(EXCLUDED."daily_limit", u."daily_limit"),
           "read_short_usage" = GREATEST(u."read_short_usage", EXCLUDED."read_short_usage"),
           "read_short_limit" = COALESCE(EXCLUDED."read_short_limit", u."read_short_limit"),
           "read_daily_usage" = GREATEST(u."read_daily_usage", EXCLUDED."read_daily_usage"),
           "read_daily_limit" = COALESCE(EXCLUDED."read_daily_limit", u."read_daily_limit")`,
        [
          quarterStart(observedAt),
          overall?.fifteenMinutes.usage ?? null,
          overall?.fifteenMinutes.limit ?? null,
          overall?.daily.usage ?? null,
          overall?.daily.limit ?? null,
          read?.fifteenMinutes.usage ?? null,
          read?.fifteenMinutes.limit ?? null,
          read?.daily.usage ?? null,
          read?.daily.limit ?? null,
        ],
      );
    } catch (error) {
      this.logger.warn(`Strava usage not recorded: ${String(error)}`);
    }
  }
}
