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

/**
 * A version after Semantic Versioning 2.0: `major.minor.patch`, then a
 * pre-release (`-beta.1`, `-rc.2`) and build metadata (`+20261103`), both
 * optional. No `v` prefix.
 */
export const RELEASE_VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export const RELEASE_VERSION_MAX_LENGTH = 40;

export const RELEASE_NOTE_TITLE_MAX_LENGTH = 80;
export const RELEASE_NOTE_SUMMARY_MAX_LENGTH = 240;
export const RELEASE_NOTE_SECTION_MAX_LENGTH = 6000;

/** What a version changes, after its number. */
export type ReleaseImpact = "major" | "minor" | "patch";

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  /** The identifiers of the pre-release, numbers as numbers; empty for a release. */
  prerelease: (string | number)[];
}

/** The parts of a version, null when it is not one. Build metadata is left out: it never orders. */
export function parseVersion(version: string): ParsedVersion | null {
  const match = RELEASE_VERSION_PATTERN.exec(version);
  if (!match || version.length > RELEASE_VERSION_MAX_LENGTH) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".").map((id) => (/^\d+$/.test(id) ? Number(id) : id)) : [],
  };
}

function compareIdentifiers(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  // Numbers come before words.
  if (typeof a === "number") return -1;
  if (typeof b === "number") return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Negative when `a` comes before `b`, after Semantic Versioning (`1.0.0-beta.2` < `1.0.0-beta.10` < `1.0.0`); versions that are not ones last. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return left ? -1 : right ? 1 : 0;
  const core = left.major - right.major || left.minor - right.minor || left.patch - right.patch;
  if (core) return core;
  // A pre-release comes before its release.
  if (!left.prerelease.length || !right.prerelease.length) return right.prerelease.length - left.prerelease.length;
  for (let at = 0; at < Math.min(left.prerelease.length, right.prerelease.length); at++) {
    const order = compareIdentifiers(left.prerelease[at]!, right.prerelease[at]!);
    if (order) return order;
  }
  return left.prerelease.length - right.prerelease.length;
}

/**
 * A text sorted as the versions are, for the database: the numbers padded,
 * a release after its pre-releases (`~` after `-`), numeric identifiers
 * before words.
 */
export function versionSortKey(version: string): string {
  const parsed = parseVersion(version);
  if (!parsed) return `~~${version}`;
  const pad = (value: number) => String(value).padStart(10, "0");
  const core = [parsed.major, parsed.minor, parsed.patch].map(pad).join(".");
  if (!parsed.prerelease.length) return `${core}~`;
  return `${core}-${parsed.prerelease.map((id) => (typeof id === "number" ? `0${pad(id)}` : `1${id}`)).join(".")}`;
}

/** Whether `version` is a pre-release, e.g. `1.0.0-beta.1`. */
export const isPrerelease = (version: string) => (parseVersion(version)?.prerelease.length ?? 0) > 0;

/** `x.0.0` a major one, `x.y.0` a minor one, any other a patch; a pre-release counts as a patch, for the few who try it. */
export function releaseImpact(version: string): ReleaseImpact {
  const parts = parseVersion(version);
  if (!parts || parts.prerelease.length) return "patch";
  if (parts.minor === 0 && parts.patch === 0) return "major";
  if (parts.patch === 0) return "minor";
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
  /** The image across the top, null without one. */
  bannerUrl: string | null;
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
