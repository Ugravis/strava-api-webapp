import {
  ADMIN_PAGE_SIZE,
  type AdminPage,
  type AuditLogEntry,
} from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager } from 'typeorm';
import { In, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { User } from '../../users/user.entity';
import { toAuditUser } from '../common/audit-user';
import { AdminAuditLog } from './admin-audit-log.entity';
import type { AuditLogQueryDto } from './audit-log-query.dto';

const MATCHING_USERS =
  'SELECT id FROM users WHERE username ILIKE :q OR display_name ILIKE :q';

function likeEscaped(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export interface AuditEntry {
  actorId: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  reason?: string | null;
  succeeded: boolean;
  status?: number | null;
  details?: Record<string, unknown> | null;
}

@Injectable()
export class AdminAuditLogService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly entries: Repository<AdminAuditLog>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /**
   * A page of the entries by date, the latest first by default. Masked entries are left out
   * unless `withHidden`, granted to the super-admins.
   */
  async page(
    query: AuditLogQueryDto,
    withHidden: boolean,
  ): Promise<AdminPage<AuditLogEntry>> {
    const builder = this.entries
      .createQueryBuilder('entry')
      .orderBy('entry.created_at', query.order === 'asc' ? 'ASC' : 'DESC')
      .addOrderBy('entry.id', query.order === 'asc' ? 'ASC' : 'DESC')
      .offset((query.page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE);
    if (query.action?.endsWith('.')) {
      builder.andWhere('entry.action LIKE :action', {
        action: `${query.action}%`,
      });
    } else if (query.action) {
      builder.andWhere('entry.action = :action', { action: query.action });
    }
    if (query.q) {
      // The reason, the action, or the name of the author or of the target.
      builder.andWhere(
        `(entry.reason ILIKE :q OR entry.action ILIKE :q OR entry.actor_id IN (${MATCHING_USERS}) OR entry.target_id IN (SELECT CAST(id AS text) FROM (${MATCHING_USERS}) matching))`,
        { q: `%${likeEscaped(query.q)}%` },
      );
    }
    if (query.actor) {
      builder.andWhere('entry.actor_id = :actor', { actor: query.actor });
    }
    if (query.target) {
      builder.andWhere('entry.target_id = :target', { target: query.target });
    }
    if (query.outcome !== 'all') {
      builder.andWhere('entry.succeeded = :succeeded', {
        succeeded: query.outcome === 'succeeded',
      });
    }
    const visibility = withHidden ? query.visibility : 'visible';
    if (visibility !== 'all') {
      builder.andWhere(
        visibility === 'visible'
          ? 'entry.hidden_at IS NULL'
          : 'entry.hidden_at IS NOT NULL',
      );
    }

    const [rows, total] = await builder.getManyAndCount();
    const userIds = new Set(
      rows.flatMap((row) => [
        ...(row.actorId ? [row.actorId] : []),
        ...(row.targetType === 'user' && row.targetId ? [row.targetId] : []),
      ]),
    );
    const users = new Map(
      (userIds.size > 0
        ? await this.users.findBy({ id: In([...userIds]) })
        : []
      ).map((user) => [user.id, user]),
    );
    return {
      items: rows.map((row) => ({
        id: row.id,
        actor: row.actorId
          ? toAuditUser(row.actorId, users.get(row.actorId))
          : null,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        targetUser:
          row.targetType === 'user' && row.targetId
            ? toAuditUser(row.targetId, users.get(row.targetId))
            : null,
        reason: row.reason,
        details: row.details,
        succeeded: row.succeeded,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        ...(withHidden && { hiddenAt: row.hiddenAt?.toISOString() ?? null }),
      })),
      total,
      page: query.page,
      pageSize: ADMIN_PAGE_SIZE,
    };
  }

  /**
   * Masks an entry from everyone but the super-admins, or shows it again:
   * the only change the append-only trigger lets through.
   */
  async setHidden(id: string, hiddenBy: string | null): Promise<void> {
    const { affected } = await this.entries.update(
      { id },
      { hiddenAt: hiddenBy ? new Date() : null, hiddenBy },
    );
    if (!affected) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'Entry not found');
    }
  }

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
      details: entry.details ?? null,
    } as QueryDeepPartialEntity<AdminAuditLog>;
    await (manager
      ? manager.insert(AdminAuditLog, values)
      : this.entries.insert(values));
  }
}
