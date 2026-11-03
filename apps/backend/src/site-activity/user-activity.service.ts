import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** `YYYY-MM-DD` of a date, in UTC. */
const utcDay = (date: Date) => date.toISOString().slice(0, 10);

/** Records the days each signed-in user is active on. */
@Injectable()
export class UserActivityService {
  private readonly logger = new Logger(UserActivityService.name);
  /** Users already recorded today, so that a day costs one write per user. */
  private recorded = new Set<string>();
  private recordedDay = '';

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Never awaited by the request: a failed write only loses the day. */
  record(userId: string, now = new Date()): void {
    const day = utcDay(now);
    if (day !== this.recordedDay) {
      this.recorded = new Set();
      this.recordedDay = day;
    }
    if (this.recorded.has(userId)) {
      return;
    }
    this.recorded.add(userId);
    this.dataSource
      .query(
        `INSERT INTO "user_activity" ("user_id", "day") VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, day],
      )
      .catch((error: unknown) => {
        this.recorded.delete(userId);
        this.logger.warn(
          `Activity of ${userId} not recorded: ${String(error)}`,
        );
      });
  }
}
