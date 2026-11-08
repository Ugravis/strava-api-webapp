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

/** `PUT /api/admin/system/showcase`: the second part of the profiles, shown or not. */
export interface SetShowcaseRequest {
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

/** A column of a table of the database. */
export interface AdminDatabaseColumn {
  name: string;
  /** As Postgres prints it, e.g. `character varying(40)`. */
  type: string;
  nullable: boolean;
  default: string | null;
  primaryKey: boolean;
}

export interface AdminDatabaseIndex {
  name: string;
  /** `CREATE INDEX …` as Postgres prints it. */
  definition: string;
  unique: boolean;
  primary: boolean;
  bytes: number;
  scans: number;
}

/** A constraint of the table pointing to another one. */
export interface AdminDatabaseForeignKey {
  name: string;
  /** `schema.table` pointed to. */
  references: string;
  /** `FOREIGN KEY (…) REFERENCES …` as Postgres prints it. */
  definition: string;
}

/** `GET /api/admin/system/database`: a table of the database, read from the catalogs of Postgres. */
export interface AdminDatabaseTable {
  /** `schema.table`, unique. */
  id: string;
  schema: string;
  name: string;
  comment: string | null;
  /** Owned by an extension, e.g. PostGIS. */
  extension: string | null;
  /** Estimated by the statistics of Postgres, not counted. */
  rows: number;
  totalBytes: number;
  tableBytes: number;
  indexBytes: number;
  columns: AdminDatabaseColumn[];
  indexes: AdminDatabaseIndex[];
  foreignKeys: AdminDatabaseForeignKey[];
  /** `schema.table` of the tables pointing to this one. */
  referencedBy: string[];
  seqScans: number;
  indexScans: number;
  inserts: number;
  updates: number;
  deletes: number;
  deadRows: number;
  /** ISO 8601, manual or automatic, whichever came last. */
  lastVacuum: string | null;
  lastAnalyze: string | null;
}
