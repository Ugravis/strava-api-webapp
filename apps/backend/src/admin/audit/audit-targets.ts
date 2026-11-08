import type { AuditTarget, AuditTargetType } from '@kilotrace/shared/admin';
import { type EntityManager, In } from 'typeorm';
import { BadgeTheme } from '../../distances/badge-theme.entity';
import { Badge } from '../../distances/badge.entity';
import { ReleaseNote } from '../../release-notes/release-note.entity';
import { UserReport } from '../../reports/user-report.entity';
import { UserTag } from '../../users/user-tag.entity';
import type { AdminAuditLog } from './admin-audit-log.entity';

/*
 * The objects other than users the entries target, named as they are now,
 * else as recorded in the details of the entry once deleted.
 */

/** The object an action creates, read from its details: no target is recorded before it exists. */
const CREATED: Record<string, { type: AuditTargetType; key: string }> = {
  'badges.create': { type: 'badge', key: 'id' },
  'badges.themes.create': { type: 'badge_theme', key: 'id' },
  'userTags.create': { type: 'userTag', key: 'id' },
  'releaseNotes.create': { type: 'releaseNote', key: 'version' },
  'usernames.reserve': { type: 'username', key: 'username' },
  'usernames.update': { type: 'username', key: 'username' },
  'usernames.release': { type: 'username', key: 'username' },
};

const TYPES = new Set<string>([
  'badge',
  'badge_theme',
  'userTag',
  'releaseNote',
  'report',
]);

interface Ref {
  type: AuditTargetType;
  id: string;
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

/** The object an entry targets or creates, a user left out. */
function refOf(row: AdminAuditLog): Ref | null {
  if (row.targetType && row.targetId && TYPES.has(row.targetType)) {
    return { type: row.targetType as AuditTargetType, id: row.targetId };
  }
  const created = CREATED[row.action];
  const id = created && text(row.details?.[created.key]);
  return id ? { type: created.type, id } : null;
}

type Found = Pick<AuditTarget, 'name' | 'color'>;

/** Every object of one kind among `ids`, by id. */
async function find(
  manager: EntityManager,
  type: AuditTargetType,
  ids: string[],
): Promise<Map<string, Found>> {
  const by = <T>(rows: T[], id: (row: T) => string, found: (row: T) => Found) =>
    new Map(rows.map((row) => [id(row), found(row)]));
  switch (type) {
    case 'badge':
      return by(
        await manager.findBy(Badge, { id: In(ids) }),
        (badge) => badge.id,
        (badge) => ({ name: badge.name, color: badge.backgroundColor }),
      );
    case 'badge_theme':
      return by(
        await manager.findBy(BadgeTheme, { id: In(ids) }),
        (theme) => theme.id,
        (theme) => ({ name: theme.name, color: null }),
      );
    case 'userTag':
      return by(
        await manager.findBy(UserTag, { id: In(ids) }),
        (tag) => tag.id,
        (tag) => ({ name: tag.name, color: tag.color }),
      );
    case 'releaseNote':
      return by(
        await manager.findBy(ReleaseNote, { version: In(ids) }),
        (note) => note.version,
        (note) => ({
          name: note.title ? `${note.version} · ${note.title}` : note.version,
          color: null,
        }),
      );
    case 'report':
      return by(
        await manager.findBy(UserReport, { id: In(ids) }),
        (report) => report.id,
        (report) => ({ name: `@${report.targetUsername}`, color: null }),
      );
    case 'username':
      return new Map(ids.map((id) => [id, { name: id, color: null }]));
    default:
      return new Map();
  }
}

/** The name an entry recorded of an object deleted since. */
function recordedName(row: AdminAuditLog, ref: Ref): string {
  const name = text(row.details?.name) ?? text(row.details?.title);
  return ref.type === 'releaseNote' && name
    ? `${ref.id} · ${name}`
    : (name ?? ref.id);
}

/** The target object of each entry, by the id of the entry; one query per kind. */
export async function auditTargets(
  manager: EntityManager,
  rows: AdminAuditLog[],
): Promise<Map<string, AuditTarget>> {
  const refs = new Map<string, Ref>();
  const ids = new Map<AuditTargetType, Set<string>>();
  for (const row of rows) {
    const ref = refOf(row);
    if (!ref) continue;
    refs.set(row.id, ref);
    ids.set(ref.type, (ids.get(ref.type) ?? new Set()).add(ref.id));
  }
  const found = new Map(
    await Promise.all(
      [...ids].map(
        async ([type, set]) =>
          [type, await find(manager, type, [...set])] as const,
      ),
    ),
  );
  const targets = new Map<string, AuditTarget>();
  for (const row of rows) {
    const ref = refs.get(row.id);
    if (!ref) continue;
    const object = found.get(ref.type)?.get(ref.id);
    targets.set(row.id, {
      ...ref,
      name: object?.name ?? recordedName(row, ref),
      color: object?.color ?? null,
      deleted: !object,
    });
  }
  return targets;
}
