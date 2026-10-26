import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager } from 'typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog } from './admin-audit-log.entity';

export interface AuditEntry {
  actorId: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  reason?: string | null;
  succeeded: boolean;
  status?: number | null;
}

@Injectable()
export class AdminAuditLogService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly entries: Repository<AdminAuditLog>,
  ) {}

  /** Inserts only, optionally within a transaction of the action itself. */
  async record(entry: AuditEntry, manager?: EntityManager): Promise<void> {
    const values = {
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId?.slice(0, 100) ?? null,
      reason: entry.reason ?? null,
      succeeded: entry.succeeded,
      status: entry.status ?? null,
    };
    await (manager
      ? manager.insert(AdminAuditLog, values)
      : this.entries.insert(values));
  }
}
