/**
 * Release notes: what changed in a version of the site, told to the users
 * once it is out. Browser-safe: read by the public pages and the back office.
 */

/** How a note reaches the users, the strongest first. */
export const RELEASE_NOTE_DISPLAYS = ["popup", "banner", "notification", "none"] as const;
export type ReleaseNoteDisplay = (typeof RELEASE_NOTE_DISPLAYS)[number];

/** The parts of a note, in the order they are shown. */
export const RELEASE_NOTE_SECTIONS = ["new", "improved", "fixed", "other"] as const;
export type ReleaseNoteSection = (typeof RELEASE_NOTE_SECTIONS)[number];

/** `major.minor.patch`, without prefix nor pre-release. */
export const RELEASE_VERSION_PATTERN = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})$/;

export const RELEASE_NOTE_TITLE_MAX_LENGTH = 80;
export const RELEASE_NOTE_SUMMARY_MAX_LENGTH = 240;
export const RELEASE_NOTE_SECTION_MAX_LENGTH = 6000;

/** What a version changes, after its number. */
export type ReleaseImpact = "major" | "minor" | "patch";

/** `[major, minor, patch]` of a version, null when it is not one. */
export function parseVersion(version: string): [number, number, number] | null {
  const match = RELEASE_VERSION_PATTERN.exec(version);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Negative when `a` comes before `b`; versions that are not ones last. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return (left ? -1 : right ? 1 : 0);
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

/** `x.0.0` a major one, `x.y.0` a minor one, any other a patch. */
export function releaseImpact(version: string): ReleaseImpact {
  const parts = parseVersion(version);
  if (parts && parts[1] === 0 && parts[2] === 0) return "major";
  if (parts && parts[2] === 0) return "minor";
  return "patch";
}

/** The display a note gets until the team picks another: the larger the change, the louder. */
export const DEFAULT_RELEASE_NOTE_DISPLAY: Record<ReleaseImpact, ReleaseNoteDisplay> = {
  major: "popup",
  minor: "banner",
  patch: "notification",
};

export const defaultDisplayOf = (version: string): ReleaseNoteDisplay => DEFAULT_RELEASE_NOTE_DISPLAY[releaseImpact(version)];

/** The strongest of `displays`, `none` without any. */
export function strongestDisplay(displays: readonly ReleaseNoteDisplay[]): ReleaseNoteDisplay {
  return RELEASE_NOTE_DISPLAYS.find((display) => displays.includes(display)) ?? "none";
}

/** The text of a note, every part optional. */
export interface ReleaseNoteContent {
  title: string | null;
  /** One or two sentences: the banner, the notification and the top of the popup. */
  summary: string | null;
  /** Markdown of each part, null when it has nothing to say. */
  sections: Record<ReleaseNoteSection, string | null>;
}

/** A note published to the users. */
export interface PublicReleaseNote extends ReleaseNoteContent {
  version: string;
  display: ReleaseNoteDisplay;
  /** When the version went out, ISO 8601. */
  releasedAt: string;
}

/** `GET /api/release-notes/unseen`: the notes the user has not seen yet, the latest first. */
export interface UnseenReleaseNotesResponse {
  notes: PublicReleaseNote[];
  /** The strongest display among them: how they are shown together. */
  display: ReleaseNoteDisplay;
}

/** `GET /api/release-notes`: every published note, the latest first. */
export interface ReleaseNotesResponse {
  notes: PublicReleaseNote[];
}

/** `POST /api/release-notes/seen`: the notes the user saw, by version. */
export interface MarkReleaseNotesSeenRequest {
  versions: string[];
}

/** Whether a note has anything to say. */
export function hasReleaseNoteContent({ title, summary, sections }: ReleaseNoteContent): boolean {
  return !!(title?.trim() || summary?.trim() || Object.values(sections).some((body) => body?.trim()));
}
