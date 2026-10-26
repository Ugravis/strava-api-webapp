"use client";

import { cn } from "@/lib/utils";

type Row = Record<string, unknown>;

/** Columns whose recent value highlights the row (fresh webhook, updated activity). */
const FRESHNESS_COLUMNS = ["receivedAt", "updatedAt", "finishedAt", "createdAt"];
const FRESH_MS = 60_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "✓" : "✗";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(1);
  if (typeof value === "string" && ISO_DATE.test(value)) {
    return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isFresh(row: Row, now: number): boolean {
  return FRESHNESS_COLUMNS.some((column) => {
    const value = row[column];
    return typeof value === "string" && now - new Date(value).getTime() < FRESH_MS;
  });
}

/** Generic table: one column per field of the rows. */
export function DevTable({ rows, now }: { rows: Row[]; now: number }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune ligne.</p>;
  }
  const columns = Object.keys(rows[0]).filter((column) => column !== "id");

  return (
    <div className="max-h-96 overflow-auto rounded-lg border">
      <table className="w-full text-left font-mono text-xs">
        <thead className="sticky top-0 bg-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-2 py-1.5 font-medium whitespace-nowrap">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={typeof row.id === "string" ? row.id : index}
              className={cn("border-t", isFresh(row, now) && "bg-amber-500/15")}
            >
              {columns.map((column) => (
                <td key={column} className="max-w-64 truncate px-2 py-1 whitespace-nowrap" title={formatValue(row[column])}>
                  {formatValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
