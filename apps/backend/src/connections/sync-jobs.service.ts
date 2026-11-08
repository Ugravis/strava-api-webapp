import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import {
  ACTIVE_SYNC_JOB_STATUSES,
  SyncJob,
  type SyncJobKind,
} from './sync-job.entity';

const MAX_ATTEMPTS = 5;

/** Persistent job queue backed by PostgreSQL (`FOR UPDATE SKIP LOCKED`). */
@Injectable()
export class SyncJobsService {
  constructor(
    @InjectRepository(SyncJob) private readonly jobs: Repository<SyncJob>,
  ) {}

  /** Queues a job unless one is already pending or running for the connection. */
  async enqueue(connectionId: string, kind: SyncJobKind): Promise<void> {
    await this.jobs
      .createQueryBuilder()
      .insert()
      .values({ connectionId, kind })
      .orIgnore()
      .execute();
  }

  /** Atomically takes the next due job, safe with several workers. */
  async claimNext(): Promise<SyncJob | null> {
    const rows: { id: string }[][] = await this.jobs.query(
      `UPDATE sync_jobs
       SET status = 'running', attempts = attempts + 1, started_at = COALESCE(started_at, now())
       WHERE id = (
         SELECT id FROM sync_jobs
         WHERE status = 'queued' AND run_after <= now()
         ORDER BY run_after
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING id`,
    );
    const id = rows[0]?.[0]?.id;
    return id ? this.jobs.findOneBy({ id }) : null;
  }

  async saveProgress(
    job: SyncJob,
    progress: Pick<SyncJob, 'processed' | 'total' | 'nextPage'>,
  ): Promise<void> {
    Object.assign(job, progress);
    await this.jobs.update(job.id, progress);
  }

  async complete(job: SyncJob): Promise<void> {
    await this.jobs.update(job.id, {
      status: 'completed',
      finishedAt: new Date(),
      errorCode: null,
    });
  }

  /** Puts the job back in the queue until `runAfter`, without counting an attempt. */
  async defer(job: SyncJob, runAfter: Date, reason: string): Promise<void> {
    await this.jobs.update(job.id, {
      status: 'queued',
      runAfter,
      attempts: Math.max(job.attempts - 1, 0),
      errorCode: reason,
    });
  }

  /** Retries with an exponential backoff, then gives up. */
  async fail(job: SyncJob, errorCode: string): Promise<void> {
    if (job.attempts >= MAX_ATTEMPTS) {
      await this.jobs.update(job.id, {
        status: 'failed',
        finishedAt: new Date(),
        errorCode,
      });
      return;
    }
    const delayMs = 30_000 * 2 ** (job.attempts - 1);
    await this.jobs.update(job.id, {
      status: 'queued',
      runAfter: new Date(Date.now() + delayMs),
      errorCode,
    });
  }

  /** Requeues jobs left running by a stopped process. */
  async requeueInterrupted(): Promise<number> {
    const result = await this.jobs.update(
      { status: 'running' },
      { status: 'queued' },
    );
    return result.affected ?? 0;
  }

  latestFor(connectionId: string): Promise<SyncJob | null> {
    return this.jobs.findOne({
      where: { connectionId },
      order: { createdAt: 'DESC' },
    });
  }

  hasActiveJob(connectionId: string): Promise<boolean> {
    return this.jobs.existsBy({
      connectionId,
      status: In(ACTIVE_SYNC_JOB_STATUSES),
    });
  }

  /** Removes finished jobs older than the given date. */
  async purgeFinishedBefore(date: Date): Promise<void> {
    await this.jobs.delete({
      status: In(['completed', 'failed']),
      finishedAt: LessThanOrEqual(date),
    });
  }
}
