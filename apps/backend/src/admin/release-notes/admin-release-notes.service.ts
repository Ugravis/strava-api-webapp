import {
  compareVersions,
  defaultDisplayOf,
  hasReleaseNoteContent,
  versionSortKey,
} from '@kilotrace/shared';
import type {
  AdminReleaseNote,
  AdminReleaseNotesOverview,
  ReleaseNoteState,
  ReleaseNoteStatus,
} from '@kilotrace/shared/admin';
import {
  mapTablePage,
  type TablePage,
  type TableQuery,
} from '@kilotrace/shared/table';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import { ReleaseNote } from '../../release-notes/release-note.entity';
import { ReleaseNoteBannersService } from '../../release-notes/release-note-banners.service';
import {
  bannerUrlOf,
  concernedUsers,
  contentOf,
  NOTE_HAS_CONTENT,
  ReleaseNotesService,
  VERSION_ORDER,
} from '../../release-notes/release-notes.service';
import { User } from '../../users/user.entity';
import { toAuditUser } from '../common/audit-user';
import { runTableQuery, type TableSpec } from '../common/table-query';
import type {
  CreateReleaseNoteDto,
  UpdateReleaseNoteDto,
} from './admin-release-notes.dto';

const STATE = `CASE WHEN NOT ${NOTE_HAS_CONTENT} THEN 'empty' WHEN note.status = 'draft' THEN 'draft' WHEN note.disabled_at IS NOT NULL THEN 'disabled' WHEN note.released_at IS NULL THEN 'scheduled' WHEN note.display = 'none' THEN 'silent' ELSE 'published' END`;

const CONCERNED = `(CASE WHEN note.released_at IS NULL THEN NULL ELSE (SELECT COUNT(*) FROM users u WHERE ${concernedUsers('note.released_at')}) END)`;

const SEEN = `(SELECT COUNT(*) FROM release_note_views v JOIN users u ON u.id = v.user_id WHERE v.version = note.version AND ${concernedUsers('note.released_at')})`;

const RELEASE_NOTES_TABLE: TableSpec = {
  search: [
    'note.version',
    'note.title',
    'note.summary',
    'note.section_new',
    'note.section_improved',
    'note.section_fixed',
    'note.section_other',
  ],
  sorts: {
    version: VERSION_ORDER,
    releasedAt: 'note.released_at',
    concerned: CONCERNED,
    seen: SEEN,
    rate: `(${SEEN}::float / NULLIF(${CONCERNED}, 0))`,
    updatedAt: 'note.updated_at',
  },
  defaultSort: { id: 'version', desc: true },
  tiebreak: 'note.version',
  facets: {
    state: {
      options: {
        empty: `${STATE} = 'empty'`,
        draft: `${STATE} = 'draft'`,
        scheduled: `${STATE} = 'scheduled'`,
        published: `${STATE} = 'published'`,
        silent: `${STATE} = 'silent'`,
        disabled: `${STATE} = 'disabled'`,
      },
    },
    display: { column: 'note.display' },
  },
  groupings: {
    state: STATE,
    display: 'note.display',
    release: `CASE WHEN note.released_at IS NULL THEN 'upcoming' ELSE 'released' END`,
  },
};

/** Fields of a DTO onto the columns: those left out unchanged, an empty text cleared. */
function fieldsOf(dto: UpdateReleaseNoteDto): Partial<ReleaseNote> {
  return {
    ...(dto.title !== undefined && { title: dto.title }),
    ...(dto.summary !== undefined && { summary: dto.summary }),
    ...(dto.new !== undefined && { sectionNew: dto.new }),
    ...(dto.improved !== undefined && { sectionImproved: dto.improved }),
    ...(dto.fixed !== undefined && { sectionFixed: dto.fixed }),
    ...(dto.other !== undefined && { sectionOther: dto.other }),
    ...(dto.display !== undefined && { display: dto.display }),
    ...(dto.githubUrl !== undefined && { githubUrl: dto.githubUrl }),
  };
}

function stateOf(note: ReleaseNote): ReleaseNoteState {
  if (!hasReleaseNoteContent(contentOf(note))) return 'empty';
  if (note.status === 'draft') return 'draft';
  if (note.disabledAt) return 'disabled';
  if (!note.releasedAt) return 'scheduled';
  return note.display === 'none' ? 'silent' : 'published';
}

/** The releases and their notes, for the back office. */
@Injectable()
export class AdminReleaseNotesService {
  constructor(
    @InjectRepository(ReleaseNote)
    private readonly notes: Repository<ReleaseNote>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly releaseNotes: ReleaseNotesService,
    private readonly banners: ReleaseNoteBannersService,
  ) {}

  async table(query: TableQuery): Promise<TablePage<AdminReleaseNote>> {
    const page = await runTableQuery(
      this.notes.createQueryBuilder('note'),
      query,
      RELEASE_NOTES_TABLE,
    );
    return mapTablePage(page, (notes) => this.rows(notes));
  }

  async overview(): Promise<AdminReleaseNotesOverview> {
    const [counts] = await this.notes.query<
      {
        releases: number;
        published: number;
        missing: number;
        upcoming: number;
      }[]
    >(
      `SELECT COUNT(*) FILTER (WHERE note.released_at IS NOT NULL)::int AS releases,
              COUNT(*) FILTER (WHERE ${STATE} IN ('published', 'silent'))::int AS published,
              COUNT(*) FILTER (WHERE note.released_at IS NOT NULL AND ${STATE} IN ('empty', 'draft'))::int AS missing,
              COUNT(*) FILTER (WHERE note.released_at IS NULL)::int AS upcoming
         FROM release_notes note`,
    );
    const [latest] = await this.notes.query<
      { version: string; concerned: number; seen: number }[]
    >(
      `SELECT note.version, ${CONCERNED}::int AS concerned, ${SEEN}::int AS seen
         FROM release_notes note WHERE ${STATE} = 'published'
        ORDER BY ${VERSION_ORDER} DESC LIMIT 1`,
    );
    return {
      currentVersion: this.releaseNotes.currentVersion,
      releases: counts?.releases ?? 0,
      published: counts?.published ?? 0,
      missing: counts?.missing ?? 0,
      upcoming: counts?.upcoming ?? 0,
      latest: latest ?? null,
    };
  }

  /** A note written ahead for a version not out yet, a draft until made ready. */
  async create(dto: CreateReleaseNoteDto, actor: User): Promise<void> {
    if (await this.notes.existsBy({ version: dto.version })) {
      throw ApiErrors.conflict(ApiErrorCode.IdTaken, 'Release note exists');
    }
    if (compareVersions(dto.version, this.releaseNotes.currentVersion) <= 0) {
      throw ApiErrors.conflict(
        ApiErrorCode.VersionReleased,
        'Version already out',
      );
    }
    await this.notes.insert({
      version: dto.version,
      versionOrder: versionSortKey(dto.version),
      display: defaultDisplayOf(dto.version),
      status: 'draft',
      ...fieldsOf(dto),
      updatedById: actor.id,
    });
  }

  async update(
    version: string,
    dto: UpdateReleaseNoteDto,
    actor: User,
  ): Promise<void> {
    const note = await this.find(version);
    const renamed = dto.version !== undefined && dto.version !== version;
    if (renamed) await this.assertRenamable(note, dto.version!);
    const next = this.notes.merge(note, fieldsOf(dto));
    if (note.status === 'ready' && !hasReleaseNoteContent(contentOf(next))) {
      throw ApiErrors.conflict(
        ApiErrorCode.ReleaseNoteEmpty,
        'A ready note keeps something to say',
      );
    }
    await this.notes.update(version, {
      ...fieldsOf(dto),
      ...(renamed && {
        version: dto.version,
        versionOrder: versionSortKey(dto.version!),
      }),
      updatedById: actor.id,
    });
    await this.releaseNotes.sync(renamed ? dto.version! : version);
  }

  /** A draft not out yet takes another version, neither listed nor out. */
  private async assertRenamable(note: ReleaseNote, to: string): Promise<void> {
    if (note.status !== 'draft' || note.releasedAt) {
      throw ApiErrors.conflict(
        ApiErrorCode.ReleaseNotePublished,
        'Only a draft not out yet is renamed',
      );
    }
    if (await this.notes.existsBy({ version: to })) {
      throw ApiErrors.conflict(ApiErrorCode.IdTaken, 'Release note exists');
    }
    if (compareVersions(to, this.releaseNotes.currentVersion) <= 0) {
      throw ApiErrors.conflict(
        ApiErrorCode.VersionReleased,
        'Version already out',
      );
    }
  }

  /**
   * Ready: shown to the users as soon as the version is out, at once if it
   * is. Back to a draft only before: a published note is disabled at most.
   */
  async setStatus(
    version: string,
    status: ReleaseNoteStatus,
    actor: User,
  ): Promise<void> {
    const note = await this.find(version);
    if (status === 'ready' && !hasReleaseNoteContent(contentOf(note))) {
      throw ApiErrors.conflict(
        ApiErrorCode.ReleaseNoteEmpty,
        'Nothing to publish',
      );
    }
    if (status === 'draft' && note.status === 'ready' && note.releasedAt) {
      throw ApiErrors.conflict(
        ApiErrorCode.ReleaseNotePublished,
        'A published note is disabled, never back to a draft',
      );
    }
    await this.notes.update(version, { status, updatedById: actor.id });
    await this.releaseNotes.sync(version);
  }

  /**
   * Hides a published note from the users (history, popup, banner, its
   * notifications withdrawn), or shows it again without notifying anyone.
   */
  async setActive(
    version: string,
    active: boolean,
    actor: User,
  ): Promise<void> {
    const note = await this.find(version);
    if (note.status !== 'ready' || !note.releasedAt) {
      throw ApiErrors.conflict(
        ApiErrorCode.ReleaseNotePublished,
        'Only a published note is disabled',
      );
    }
    await this.notes.update(version, {
      disabledAt: active ? null : new Date(),
      updatedById: actor.id,
    });
    await this.releaseNotes.sync(version);
  }

  /** A new banner in place of the previous one, deleted once replaced. */
  async setBanner(version: string, file: Buffer, actor: User): Promise<void> {
    const note = await this.find(version);
    const key = await this.banners.store(file);
    await this.notes.update(version, { bannerKey: key, updatedById: actor.id });
    await this.banners.deleteQuietly(note.bannerKey);
  }

  async removeBanner(version: string, actor: User): Promise<void> {
    const note = await this.find(version);
    await this.notes.update(version, {
      bannerKey: null,
      updatedById: actor.id,
    });
    await this.banners.deleteQuietly(note.bannerKey);
  }

  /** Only a note written ahead: a release stays listed. */
  async delete(version: string): Promise<void> {
    const note = await this.find(version);
    if (note.releasedAt) {
      throw ApiErrors.conflict(
        ApiErrorCode.VersionReleased,
        'A released version stays listed',
      );
    }
    await this.notes.delete(version);
    await this.banners.deleteQuietly(note.bannerKey);
  }

  private async find(version: string): Promise<ReleaseNote> {
    const note = await this.notes.findOneBy({ version });
    if (!note) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such release');
    }
    return note;
  }

  private async rows(notes: ReleaseNote[]): Promise<AdminReleaseNote[]> {
    if (notes.length === 0) return [];
    const versions = notes.map(({ version }) => version);
    const counts = await this.notes.query<
      { version: string; concerned: number | null; seen: number }[]
    >(
      `SELECT note.version, ${CONCERNED}::int AS concerned, ${SEEN}::int AS seen
         FROM release_notes note WHERE note.version = ANY($1)`,
      [versions],
    );
    const countOf = new Map(counts.map((row) => [row.version, row]));
    const editorIds = [
      ...new Set(notes.flatMap(({ updatedById }) => updatedById ?? [])),
    ];
    const editors = editorIds.length
      ? await this.users.findBy({ id: In(editorIds) })
      : [];
    const editorOf = new Map(editors.map((user) => [user.id, user]));
    return notes.map((note) => {
      const content = contentOf(note);
      return {
        version: note.version,
        releasedAt: note.releasedAt?.toISOString() ?? null,
        current: note.version === this.releaseNotes.currentVersion,
        status: note.status,
        state: stateOf(note),
        display: note.display,
        ...content,
        hasContent: hasReleaseNoteContent(content),
        disabledAt: note.disabledAt?.toISOString() ?? null,
        bannerUrl: bannerUrlOf(note),
        githubUrl: note.githubUrl,
        concernedCount: countOf.get(note.version)?.concerned ?? null,
        seenCount: countOf.get(note.version)?.seen ?? 0,
        notifiedAt: note.notifiedAt?.toISOString() ?? null,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        updatedBy: note.updatedById
          ? toAuditUser(note.updatedById, editorOf.get(note.updatedById))
          : null,
      };
    });
  }
}
