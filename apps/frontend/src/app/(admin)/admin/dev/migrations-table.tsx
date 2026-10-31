"use client";

import type { AdminMigration } from "@kilotrace/shared/admin";
import { CalendarClockIcon, CircleDotIcon, DatabaseIcon, HashIcon } from "lucide-react";
import { useMemo } from "react";
import { codeColumn, type DataTableConfig, DataTable, dateColumn, localTableSource, numberColumn, statusColumn, type Tone } from "@/components/admin/data-table";

type Status = "applied" | "pending";

const STATUSES: Record<Status, { label: string; tone: Tone }> = {
  applied: { label: "Appliquée", tone: "green" },
  pending: { label: "En attente", tone: "amber" },
};

const statusOf = (migration: AdminMigration): Status => (migration.id === null ? "pending" : "applied");

/** The migrations of the code, applied or not, served in pages by the browser. */
export function MigrationsTable({ migrations }: { migrations: AdminMigration[] }) {
  const config = useMemo<DataTableConfig<AdminMigration>>(
    () => ({
      id: "migrations",
      fetch: localTableSource(migrations, {
        search: (migration) => migration.name,
        sorts: {
          id: (migration) => migration.id,
          name: (migration) => migration.name,
          createdAt: (migration) => migration.createdAt,
        },
        facets: { status: { options: Object.keys(STATUSES), values: (migration) => [statusOf(migration)] } },
      }),
      rowId: (migration) => migration.name,
      search: "Nom de la migration",
      noun: (count) => (count > 1 ? "migrations" : "migration"),
      empty: { title: "Aucune migration", description: "Les migrations de la base apparaîtront ici." },
      columns: [
        codeColumn({ id: "name", header: "Migration", icon: <DatabaseIcon />, sortable: true, locked: true, value: (migration) => migration.name, width: "max-w-96" }),
        numberColumn({ id: "id", header: "Rang", icon: <HashIcon />, sortable: true, value: (migration) => migration.id }),
        statusColumn({ id: "status", header: "Statut", icon: <CircleDotIcon />, value: statusOf, statuses: STATUSES }),
        dateColumn({ id: "createdAt", header: "Créée", icon: <CalendarClockIcon />, sortable: true, time: true, value: (migration) => migration.createdAt }),
      ],
      facets: [{ id: "status", label: "Statut", options: Object.entries(STATUSES).map(([value, { label }]) => ({ value, label })) }],
    }),
    [migrations],
  );
  return <DataTable config={config} />;
}
