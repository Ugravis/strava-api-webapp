"use server";

import { RELEASE_VERSION_PATTERN, type ReleaseNoteDisplay } from "@kilotrace/shared";
import type { AdminReleaseNote, CreateReleaseNoteRequest, ReleaseNoteStatus, UpdateReleaseNoteRequest } from "@kilotrace/shared/admin";
import type { TablePage, TableQuery } from "@kilotrace/shared/table";
import type { ActionResult } from "@kilotrace/ui/components/admin/action-state";
import { type AdminActionResult, runAdminAction } from "@/lib/admin/actions";
import { getAdminTranslations } from "@/lib/admin/messages";
import { fetchAdminRow, fetchAdminTable } from "@/lib/admin/table";

/** A page of the table of the releases. */
export async function fetchReleaseNotesTable(query: TableQuery): Promise<TablePage<AdminReleaseNote>> {
  return fetchAdminTable<AdminReleaseNote>("/release-notes/table", query);
}

/** A release and its note for its detail, null once deleted. */
export async function loadReleaseNote(version: string): Promise<AdminReleaseNote | null> {
  if (!RELEASE_VERSION_PATTERN.test(version)) return null;
  return fetchAdminRow<AdminReleaseNote>("/release-notes/table", version, (note) => note.version);
}

const errors = () => {
  const t = getAdminTranslations("releaseNotes.errors");
  return {
    ID_TAKEN: { field: "version", message: t("idTaken") },
    VERSION_RELEASED: { field: "version", message: t("released") },
    RELEASE_NOTE_EMPTY: t("empty"),
    RELEASE_NOTE_PUBLISHED: t("published"),
    INVALID_IMAGE: t("image"),
  };
};

/** A note being written ahead: every field may still be empty. */
export interface ReleaseNoteDraft {
  version: string | null;
  display: ReleaseNoteDisplay | null;
  title: string | null;
  summary: string | null;
  new: string | null;
  improved: string | null;
  fixed: string | null;
  other: string | null;
  /** The banner picked, uploaded once the note is created. */
  banner: File | string | null;
  githubUrl: string | null;
}

/** A note written ahead for a version not out yet, a draft until made ready. */
export async function createReleaseNote(draft: ReleaseNoteDraft): Promise<AdminActionResult & { id?: string }> {
  const version = (draft.version ?? "").trim();
  const body: CreateReleaseNoteRequest = {
    version,
    ...(draft.display && { display: draft.display }),
    title: draft.title?.trim() || null,
    summary: draft.summary?.trim() || null,
    new: draft.new?.trim() || null,
    improved: draft.improved?.trim() || null,
    fixed: draft.fixed?.trim() || null,
    other: draft.other?.trim() || null,
    githubUrl: draft.githubUrl?.trim() || null,
  };
  const result = await runAdminAction("/release-notes", "POST", body, errors());
  if (!result.ok) return result;
  if (draft.banner instanceof File) {
    const banner = await uploadReleaseNoteBanner(version, draft.banner);
    if (!banner.ok) return { ok: true, id: version, message: `Note de la v${version} enregistrée, sans sa bannière : ${banner.message}` };
  }
  return { ...result, id: version, message: `Note de la v${version} enregistrée en brouillon` };
}

/** The fields of a note edited in place; an empty text clears it. */
export async function saveReleaseNote(version: string, patch: UpdateReleaseNoteRequest): Promise<ActionResult> {
  return runAdminAction(pathOf(version), "PATCH", patch, errors());
}

/** Hides a published note from the users, or shows it again without notifying anyone. */
export async function setReleaseNoteActive(version: string, active: boolean): Promise<ActionResult> {
  return runAdminAction(`${pathOf(version)}/active`, "PUT", { active }, errors());
}

/** A new banner in place of the previous one; `null` removes it. */
export async function uploadReleaseNoteBanner(version: string, file: File | null): Promise<ActionResult> {
  if (!file) return runAdminAction(`${pathOf(version)}/banner`, "DELETE", undefined, errors());
  const form = new FormData();
  form.set("file", file);
  return runAdminAction(`${pathOf(version)}/banner`, "PUT", form, errors());
}

/** Ready: shown as soon as the version is out. Draft: withdrawn, before the release only. */
export async function setReleaseNoteStatus(version: string, status: ReleaseNoteStatus): Promise<ActionResult> {
  return runAdminAction(`${pathOf(version)}/status`, "PUT", { status }, errors());
}

/** Deletes a note written ahead, `reason` kept in the log. */
export async function deleteReleaseNote(version: string, reason: string | undefined): Promise<ActionResult> {
  return runAdminAction(pathOf(version), "DELETE", { reason: reason ?? "" }, errors());
}

/** The path of a version posted by the page, checked before it reaches a URL (a build may hold a `+`). */
function pathOf(version: string): string {
  if (typeof version !== "string" || !RELEASE_VERSION_PATTERN.test(version)) {
    throw new Error("Invalid version");
  }
  return `/release-notes/${encodeURIComponent(version)}`;
}
