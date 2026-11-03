import type { ReleaseNotesResponse, UnseenReleaseNotesResponse } from "@kilotrace/shared";
import { apiRequest } from "@/lib/api/client";

export const releaseNotesService = {
  /** Every published note, the latest first. */
  getAll: () => apiRequest<ReleaseNotesResponse>("/release-notes"),
  /** The notes to show on arrival, and how. */
  getUnseen: () => apiRequest<UnseenReleaseNotesResponse>("/release-notes/unseen"),
  /** Counted as seen, their notifications read. */
  markSeen: (versions: string[]) => apiRequest("/release-notes/seen", { method: "POST", body: { json: { versions } } }),
};
