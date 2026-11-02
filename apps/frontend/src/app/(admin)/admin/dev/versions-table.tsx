"use client";

import type { AdminDependencyVersion } from "@kilotrace/shared/admin";
import { BoxIcon, LayersIcon, TagIcon } from "lucide-react";
import { useMemo } from "react";
import { codeColumn, type DataTableColumn, type DataTableConfig, DataTable, localTableSource, statusColumn, textColumn, type Tone } from "@/components/admin/data-table";
import { DetailColumnFields, DetailHeader, DetailLoader, DetailMedia, DetailSection, DetailSkeleton, useRowPanel } from "@/components/admin/detail";

type Side = "backend" | "frontend";

/** A library or a server, and the side of the app it runs on. */
interface VersionRow extends AdminDependencyVersion {
  /** `version:<side>:<name>`: never the name of a migration, opened in the same panel. */
  id: string;
  side: Side;
}

const SIDES: Record<Side, { label: string; tone: Tone }> = {
  backend: { label: "Backend", tone: "blue" },
  frontend: { label: "Frontend", tone: "violet" },
};

const versionRows = (side: Side, dependencies: AdminDependencyVersion[]): VersionRow[] =>
  dependencies.map((dependency) => ({ ...dependency, side, id: `version:${side}:${dependency.name}` }));

const COLUMNS: DataTableColumn<VersionRow>[] = [
  textColumn({ id: "name", header: "Nom", icon: <BoxIcon />, sortable: true, locked: true, value: (row) => row.name }),
  codeColumn({ id: "version", header: "Version", icon: <TagIcon />, sortable: true, value: (row) => row.version }),
  statusColumn({ id: "side", header: "Côté", icon: <LayersIcon />, value: (row) => row.side, statuses: SIDES }),
];

/** The versions of the runtimes, libraries and database servers, grouped by side; a row opened in the side panel. */
export function VersionsTable({ backend, frontend }: { backend: AdminDependencyVersion[]; frontend: AdminDependencyVersion[] }) {
  const rows = useMemo(() => [...versionRows("backend", backend), ...versionRows("frontend", frontend)], [backend, frontend]);
  const config = useMemo<DataTableConfig<VersionRow>>(
    () => ({
      id: "versions",
      fetch: localTableSource(rows, {
        search: (row) => `${row.name} ${row.version ?? ""}`,
        sorts: { name: (row) => row.name, version: (row) => row.version },
        facets: { side: { options: Object.keys(SIDES), values: (row) => [row.side] } },
        groupings: { side: (row) => row.side },
      }),
      rowId: (row) => row.id,
      search: "Nom ou version",
      noun: (count) => (count > 1 ? "dépendances" : "dépendance"),
      empty: { title: "Aucune version", description: "Les versions lues au démarrage apparaîtront ici." },
      defaultSort: { id: "name", desc: false },
      defaultGroupBy: "side",
      maxHeight: "none",
      columns: COLUMNS,
      facets: [{ id: "side", label: "Côté", options: Object.entries(SIDES).map(([value, { label }]) => ({ value, label })) }],
      groupings: [{ id: "side", label: "Côté", title: (key) => SIDES[key as Side]?.label ?? key }],
    }),
    [rows],
  );
  // Read on the page: an id not among them belongs to another table.
  const load = useMemo(() => async (id: string) => rows.find((row) => row.id === id) ?? null, [rows]);
  const panel = useRowPanel<VersionRow>({
    config,
    title: (row) => row.name,
    load,
    detail: (id) => (
      <DetailLoader id={id} load={load} skeleton={<DetailSkeleton media sections={[3]} />}>
        {(row) => (
          <>
            <DetailHeader media={<DetailMedia icon={<BoxIcon />} />} title={row.name} subtitle={row.version ?? "Version inconnue"} />
            <DetailSection title="Dépendance">
              <DetailColumnFields row={row} columns={COLUMNS} ids={["name", "version", "side"]} />
            </DetailSection>
          </>
        )}
      </DetailLoader>
    ),
  });
  return <DataTable {...panel.table} />;
}
