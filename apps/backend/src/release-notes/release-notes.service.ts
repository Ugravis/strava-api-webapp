import {
  compareVersions,
  defaultDisplayOf,
  hasReleaseNoteContent,
  versionSortKey,
  type PublicReleaseNote,
  type ReleaseNoteContent,
  strongestDisplay,
  type UnseenReleaseNotesResponse,
} from '@kilotrace/shared';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { appVersion } from '../admin/dev/package-version';
import { NotificationsService } from '../notifications/notifications.service';
import type { User } from '../users/user.entity';
import { ReleaseNote } from './release-note.entity';
import { ReleaseNoteView } from './release-note-view.entity';

/** Read once: it never changes while the process runs. */
const CURRENT_VERSION = appVersion();

/** The most unseen notes shown together, the latest first. */
const UNSEEN_LIMIT = 10;

/** Sorts `release_notes` (aliased `note`) by version, pre-releases before their release. */
export const VERSION_ORDER = 'note.version_order';

/** Whether a note (aliased `note`) has anything to say. */
export const NOTE_HAS_CONTENT = `(COALESCE(btrim(note.title), '') <> '' OR COALESCE(btrim(note.summary), '') <> '' OR COALESCE(btrim(note.section_new), '') <> '' OR COALESCE(btrim(note.section_improved), '') <> '' OR COALESCE(btrim(note.section_fixed), '') <> '' OR COALESCE(btrim(note.section_other), '') <> '')`;

/** Shown to the users: ready, out, not disabled, with something to say (aliased `note`). */
const PUBLISHED = `note.status = 'ready' AND note.released_at IS NOT NULL AND note.disabled_at IS NULL AND ${NOTE_HAS_CONTENT}`;

/** The public address of a banner, from its storage key. */
export const bannerUrlOf = (note: ReleaseNote) =>
  note.bannerKey ? `/api/${note.bannerKey}` : null;

/** The accounts (aliased `u`) a note released at `releasedAt` (an SQL expression) is for: active, created before the release. */
export const concernedUsers = (releasedAt: string) =>
  `u.created_at < ${releasedAt} AND (u.suspended_at IS NULL OR u.suspended_until <= now())`;

export function contentOf(note: ReleaseNote): ReleaseNoteContent {
  return {
    title: note.title,
    summary: note.summary,
    sections: {
      new: note.sectionNew,
      improved: note.sectionImproved,
      fixed: note.sectionFixed,
      other: note.sectionOther,
    },
  };
}

function toPublic(note: ReleaseNote): PublicReleaseNote {
  return {
    version: note.version,
    display: note.display,
    releasedAt: (note.releasedAt ?? note.createdAt).toISOString(),
    bannerUrl: bannerUrlOf(note),
    ...contentOf(note),
  };
}

/** Whether the users are told about the note: ready, out, not disabled, shown somewhere, with something to say. */
export function isDelivered(note: ReleaseNote): boolean {
  return (
    note.status === 'ready' &&
    note.releasedAt !== null &&
    note.disabledAt === null &&
    note.display !== 'none' &&
    hasReleaseNoteContent(contentOf(note))
  );
}

/**
 * The releases of the site: recorded as the backend starts on a new
 * version, their notes told to the users once ready, and who saw them.
 */
@Injectable()
export class ReleaseNotesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ReleaseNotesService.name);

  constructor(
    @InjectRepository(ReleaseNote)
    private readonly notes: Repository<ReleaseNote>,
    @InjectRepository(ReleaseNoteView)
    private readonly views: Repository<ReleaseNoteView>,
    private readonly notifications: NotificationsService,
  ) {}

  get currentVersion(): string {
    return CURRENT_VERSION;
  }

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.recordRelease(CURRENT_VERSION);
    } catch (error) {
      // Never keeps the API from starting: recorded on the next start.
      this.logger.error(
        `Release ${CURRENT_VERSION} not recorded: ${String(error)}`,
      );
    }
  }

  /**
   * Records `version` as out: its row created when no note was written
   * ahead, and any note written for a version it passes (one skipped)
   * released with it. Their users are then told.
   */
  async recordRelease(version: string, now = new Date()): Promise<void> {
    await this.notes
      .createQueryBuilder()
      .insert()
      .into(ReleaseNote)
      .values({
        version,
        versionOrder: versionSortKey(version),
        display: defaultDisplayOf(version),
        status: 'draft',
      })
      .orIgnore()
      .execute();
    const pending = await this.notes.findBy({ releasedAt: IsNull() });
    for (const note of pending) {
      if (compareVersions(note.version, version) <= 0) {
        await this.notes.update(note.version, { releasedAt: now });
        await this.sync(note.version);
      }
    }
  }

  /**
   * Brings the notifications of a note in line with it: sent once, when it
   * is first delivered; withdrawn while it no longer is (disabled, shown
   * nowhere), never sent again.
   */
  async sync(version: string): Promise<void> {
    const note = await this.notes.findOneBy({ version });
    if (!note) return;
    if (isDelivered(note) && !note.notifiedAt) {
      await this.notes.update(version, { notifiedAt: new Date() });
      await this.notifications.notifyRelease(
        await this.concernedIds(note),
        version,
      );
    } else if (!isDelivered(note) && note.notifiedAt) {
      await this.notifications.withdrawRelease(version);
    }
  }

  /** The ids of the accounts a released note is for. */
  private async concernedIds(note: ReleaseNote): Promise<string[]> {
    const rows = await this.notes.query<{ id: string }[]>(
      `SELECT u.id FROM users u WHERE ${concernedUsers('$1')}`,
      [note.releasedAt],
    );
    return rows.map(({ id }) => id);
  }

  /** Every note shown to the users, those without popup nor banner included, the latest first: the history. */
  async published(): Promise<PublicReleaseNote[]> {
    const notes = await this.notes
      .createQueryBuilder('note')
      .where(PUBLISHED)
      .orderBy(VERSION_ORDER, 'DESC')
      .getMany();
    return notes.map(toPublic);
  }

  /** The notes delivered to the user and not seen yet, the latest first. */
  async unseen(user: User): Promise<UnseenReleaseNotesResponse> {
    const notes = await this.notes
      .createQueryBuilder('note')
      .where(PUBLISHED)
      .andWhere("note.display <> 'none' AND note.released_at > :createdAt", {
        createdAt: user.createdAt,
      })
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM release_note_views v WHERE v.version = note.version AND v.user_id = :userId)',
        { userId: user.id },
      )
      .orderBy(VERSION_ORDER, 'DESC')
      .limit(UNSEEN_LIMIT)
      .getMany();
    return {
      notes: notes.map(toPublic),
      display: strongestDisplay(notes.map(({ display }) => display)),
    };
  }

  /** The user saw these notes: counted once each, their notifications read. */
  async markSeen(user: User, versions: string[]): Promise<void> {
    if (versions.length === 0) return;
    const known = await this.notes.find({
      select: { version: true },
      where: versions.map((version) => ({
        disabledAt: IsNull(),
        version,
        releasedAt: Not(IsNull()),
      })),
    });
    if (known.length === 0) return;
    await this.views
      .createQueryBuilder()
      .insert()
      .into(ReleaseNoteView)
      .values(known.map(({ version }) => ({ userId: user.id, version })))
      .orIgnore()
      .execute();
    await this.notifications.markReleasesRead(
      user.id,
      known.map(({ version }) => version),
    );
  }
}
