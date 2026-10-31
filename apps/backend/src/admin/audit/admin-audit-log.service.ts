import {
  ADMIN_PAGE_SIZE,
  type AdminPage,
  type AuditLogEntry,
} from '@kilotrace/shared/admin';
import {
  mapTablePage,
  type TablePage,
  type TableQuery,
} from '@kilotrace/shared/table';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager } from 'typeorm';
import { In, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { User } from '../../users/user.entity';
import { toAuditUser } from '../common/audit-user';
import { runTableQuery, type TableSpec } from '../common/table-query';
import { AdminAuditLog } from './admin-audit-log.entity';
import type { AuditLogQueryDto } from './audit-log-query.dto';

const MATCHING_USERS =
  'SELECT id FROM users WHERE username ILIKE :q OR display_name ILIKE :q';

function likeEscaped(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/** The name of a user, by an id of the entry: author or target. */
const userName = (id: string) =>
  `(SELECT concat_ws(' ', u.username, u.display_name) FROM users u WHERE CAST(u.id AS text) = ${id})`;

/** The domain of an action, the start of its name. */
const DOMAIN = "split_part(entry.action, '.', 1)";

const DOMAINS = ['users', 'usernames', 'roles', 'badges', 'userTags', 'system'];

/** The author by username: `''` for the system, `~` for a deleted account. */
const ACTOR = `COALESCE((SELECT u.username FROM users u WHERE u.id = entry.actor_id), CASE WHEN entry.actor_id IS NULL THEN '' ELSE '~' END)`;

const auditTable = (withHidden: boolean): TableSpec => ({
  search: [
    'entry.reason',
    'entry.action',
    userName('CAST(entry.actor_id AS text)'),
    userName('entry.target_id'),
  ],
  sorts: { createdAt: 'entry.created_at', action: 'entry.action' },
  tiebreak: 'entry.id',
  facets: {
    domain: {
      options: Object.fromEntries(
        DOMAINS.map((domain) => [domain, `${DOMAIN} = '${domain}'`]),
      ),
    },
    outcome: {
      options: { succeeded: 'entry.succeeded', failed: 'NOT entry.succeeded' },
    },
    ...(withHidden && {
      visibility: {
        options: {
          visible: 'entry.hidden_at IS NULL',
          hidden: 'entry.hidden_at IS NOT NULL',
        },
      },
    }),
  },
  groupings: { domain: DOMAIN, actor: ACTOR },
});

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
    return {
      items: await this.entriesOf(rows, withHidden),
      total,
      page: query.page,
      pageSize: ADMIN_PAGE_SIZE,
    };
  }

  /**
   * A page of the data table of the entries, optionally of one author or
   * one target. Masked entries are left out unless `withHidden`.
   */
  async table(
    query: TableQuery,
    scope: { actor?: string; target?: string },
    withHidden: boolean,
  ): Promise<TablePage<AuditLogEntry>> {
    const base = this.entries.createQueryBuilder('entry');
    if (scope.actor) {
      base.andWhere('entry.actor_id = :actor', { actor: scope.actor });
    }
    if (scope.target) {
      base.andWhere('entry.target_id = :target', { target: scope.target });
    }
    if (!withHidden) {
      base.andWhere('entry.hidden_at IS NULL');
    }
    const page = await runTableQuery(base, query, auditTable(withHidden));
    return mapTablePage(page, (rows) => this.entriesOf(rows, withHidden));
  }

  /** The entries in the shape of the API, their users read at once. */
  private async entriesOf(
    rows: AdminAuditLog[],
    withHidden: boolean,
  ): Promise<AuditLogEntry[]> {
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
    return rows.map((row) => ({
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
    }));
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
