import type { AuditLogEntry } from "@kilotrace/shared/admin";

/** An entry with its texts, written on the server, where the messages of the back office live. */
export interface AuditRow extends AuditLogEntry {
  /** The action in words, else its key. */
  label: string;
  /** Its parameters in words, one per line. */
  lines: string[];
}
