import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

export interface AuditEntry {
  actorId: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  reason?: string | null;
  succeeded: boolean;
  ipAddress?: string | null;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly entries: Repository<AuditLog>,
  ) {}

  /** Inserts only: the table rejects updates and deletions. */
  async record(entry: AuditEntry): Promise<void> {
    await this.entries.insert({
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      reason: entry.reason ?? null,
      succeeded: entry.succeeded,
      ipAddress: entry.ipAddress?.slice(0, 45) ?? null,
    });
  }
}
