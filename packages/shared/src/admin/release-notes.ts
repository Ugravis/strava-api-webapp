import {
  RELEASE_NOTE_DISPLAYS,
  RELEASE_NOTE_SECTION_MAX_LENGTH,
  RELEASE_NOTE_SUMMARY_MAX_LENGTH,
  RELEASE_NOTE_TITLE_MAX_LENGTH,
  RELEASE_VERSION_MAX_LENGTH,
  RELEASE_VERSION_PATTERN,
  type ReleaseNoteContent,
  type ReleaseNoteDisplay,
} from "../release-notes";
import type { FieldRules } from "../rules";
import type { AuditUser } from "./audit";

/**
 * `draft`: never shown to the users, even once the version is out. `ready`:
 * shown as soon as it is; back to a draft only before, afterwards disabled
 * at most.
 */
export const RELEASE_NOTE_STATUSES = ["draft", "ready"] as const;
export type ReleaseNoteStatus = (typeof RELEASE_NOTE_STATUSES)[number];

/**
 * Where a release stands for the users: `empty` without a note, `draft`,
 * `scheduled` ready for a version not out yet, `published` shown,
 * `silent` ready and out but shown nowhere but the history, `disabled`
 * published then hidden by the team.
 */
export const RELEASE_NOTE_STATES = ["empty", "draft", "scheduled", "published", "silent", "disabled"] as const;
export type ReleaseNoteState = (typeof RELEASE_NOTE_STATES)[number];

/** `GET /api/admin/release-notes/table`: a release of the site and its note, one row per version, even without a note. */
export interface AdminReleaseNote extends ReleaseNoteContent {
  version: string;
  /** When the backend first started on it, null for a version not out yet. */
  releasedAt: string | null;
  /** The version running now. */
  current: boolean;
  status: ReleaseNoteStatus;
  state: ReleaseNoteState;
  display: ReleaseNoteDisplay;
  hasContent: boolean;
  /** When the team hid it once published, null while shown. */
  disabledAt: string | null;
  /** The image across the top, null without one. */
  bannerUrl: string | null;
  /** Active accounts created before the release: those the note is for. Null before the release. */
  concernedCount: number | null;
  /** Of those, the ones who saw it. */
  seenCount: number;
  /** When the users were notified, null while they were not. */
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Last member to change it, null for a row made by the release itself. */
  updatedBy: AuditUser | null;
}

/** `PATCH /api/admin/release-notes/:version`: the fields sent are changed; `version` renames a draft not out yet. */
export interface UpdateReleaseNoteRequest {
  version?: string;
  title?: string | null;
  summary?: string | null;
  new?: string | null;
  improved?: string | null;
  fixed?: string | null;
  other?: string | null;
  display?: ReleaseNoteDisplay;
}

/** `PUT /api/admin/release-notes/:version/active`: hides a published note, or shows it again without notifying anyone. */
export interface SetReleaseNoteActiveRequest {
  active: boolean;
}

/** Banner images: formats and weight accepted. */
export const RELEASE_NOTE_BANNER_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const RELEASE_NOTE_BANNER_MAX_BYTES = 5 * 1024 * 1024;

/** `PUT /api/admin/release-notes/:version/status`: ready only with something to say; back to a draft only before the release. */
export interface SetReleaseNoteStatusRequest {
  status: ReleaseNoteStatus;
}

/** `POST /api/admin/release-notes`: a note written ahead for a version not out yet. */
export interface CreateReleaseNoteRequest extends Omit<UpdateReleaseNoteRequest, "version"> {
  version: string;
}

/** `GET /api/admin/release-notes/overview`: the figures above the list. */
export interface AdminReleaseNotesOverview {
  /** The version running now. */
  currentVersion: string;
  releases: number;
  /** Out and ready. */
  published: number;
  /** Out without a ready note. */
  missing: number;
  /** Written ahead, not out yet. */
  upcoming: number;
  /** The latest note shown: its version, those concerned and those who saw it. */
  latest: { version: string; concerned: number; seen: number } | null;
}

const section = { type: "text", maxLength: RELEASE_NOTE_SECTION_MAX_LENGTH } as const;

/** The rules of a note, followed by the back office as typed and by the API. */
export const RELEASE_NOTE_RULES: FieldRules<CreateReleaseNoteRequest & SetReleaseNoteStatusRequest> = {
  version: {
    type: "text",
    required: true,
    maxLength: RELEASE_VERSION_MAX_LENGTH,
    pattern: RELEASE_VERSION_PATTERN,
    patternMessage: "Une version au format 1.2.3, ou 1.2.3-beta.1, sans « v ».",
  },
  title: { type: "text", maxLength: RELEASE_NOTE_TITLE_MAX_LENGTH },
  summary: { type: "text", maxLength: RELEASE_NOTE_SUMMARY_MAX_LENGTH },
  new: section,
  improved: section,
  fixed: section,
  other: section,
  display: { type: "choice", required: true, values: RELEASE_NOTE_DISPLAYS },
  status: { type: "choice", required: true, values: RELEASE_NOTE_STATUSES },
};
