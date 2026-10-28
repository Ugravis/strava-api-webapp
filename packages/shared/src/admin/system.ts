import type { MaintenanceTitle } from "../system/status";
import type { AuditUser } from "./audit";

/** `PUT /api/admin/system/maintenance`: turns the banner on or replaces it. */
export interface SetMaintenanceRequest {
  title: MaintenanceTitle;
  description: string | null;
}

/** `PUT /api/admin/system/signups`: the kill switch of the sign-ups. */
export interface SetSignupsRequest {
  enabled: boolean;
}

/** A stored file uploaded by a user. */
export interface AdminUploadFile {
  key: string;
  bytes: number;
  lastModified: string | null;
  /** The owner, null for an orphan file. */
  user: AuditUser | null;
}

export interface AdminStorageTotal {
  count: number;
  bytes: number;
}

/** `GET /api/admin/system/uploads`: weight of the files in the storage. */
export interface AdminUploadsAudit {
  /** Avatars imported by the users, orphans included. */
  avatars: AdminStorageTotal;
  /** The heaviest avatars still used by an account. */
  heaviest: AdminUploadFile[];
  /** Avatars no account points to any more, old enough to be safe to delete. */
  orphans: AdminStorageTotal & { files: AdminUploadFile[] };
  /** Map previews, a cache rebuilt on demand. */
  previews: AdminStorageTotal;
}
