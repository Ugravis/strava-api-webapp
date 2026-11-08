"use client";

import type { AdminDatabaseTable } from "@kilotrace/shared/admin";
import {
  ActivityIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BrushCleaningIcon,
  ChartNoAxesColumnIcon,
  ColumnsIcon,
  DatabaseIcon,
  FileTextIcon,
  FolderIcon,
  HardDriveIcon,
  KeyRoundIcon,
  LayoutListIcon,
  LinkIcon,
  ListIcon,
  PanelRightOpenIcon,
  PencilIcon,
  PlusIcon,
  PuzzleIcon,
  ScanSearchIcon,
  SkullIcon,
  TableIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo } from "react";
import {
  bytesColumn,
  codeColumn,
  customColumn,
  type DataTableColumn,
  type DataTableConfig,
  DataTable,
  dateColumn,
  formatBytes,
  formatNumber,
  LinkCell,
  localTableSource,
  numberColumn,
  textColumn,
} from "@/components/admin/data-table";
import {
  DetailColumnFields,
  DetailHeader,
  DetailItem,
  DetailItemButton,
  DetailItems,
  DetailLoader,
  DetailMedia,
  DetailSection,
  DetailSkeleton,
  type RowPanelControls,
  useRowPanel,
} from "@/components/admin/detail";

/** The tables shown by a table of another page of the back office (`adminRoutes` is server-only). */
const ADMIN_PAGES: Record<string, { label: string; href: string }> = {
  "public.users": { label: "Utilisateurs", href: "/admin/users" },
  "public.user_reports": { label: "Utilisateurs · Signalements", href: "/admin/users" },
  "public.reserved_usernames": { label: "Pseudos", href: "/admin/reserved-usernames" },
  "public.badges": { label: "Badges", href: "/admin/badges" },
  "public.badge_themes": { label: "Badges · Collections", href: "/admin/badges" },
  "public.user_tags": { label: "Tags", href: "/admin/user-tags" },
  "public.release_notes": { label: "Notes de release", href: "/admin/release-notes" },
  "public.admin_audit_log": { label: "Logs", href: "/admin/audit-log" },
  "public.admin_role_permissions": { label: "Permissions", href: "/admin/team" },
  "public.migrations": { label: "Stack · Migrations", href: "/admin/dev" },
};

const pageOf = (table: AdminDatabaseTable) => ADMIN_PAGES[table.id] ?? null;

type Key =
  | "name"
  | "schema"
  | "page"
  | "rows"
  | "totalBytes"
  | "tableBytes"
  | "indexBytes"
  | "columnsCount"
  | "indexesCount"
  | "foreignKeysCount"
  | "referencedByCount"
  | "seqScans"
  | "indexScans"
  | "inserts"
  | "updates"
  | "deletes"
  | "deadRows"
  | "lastVacuum"
  | "lastAnalyze"
  | "extension"
  | "comment";

const COLUMNS: Record<Key, DataTableColumn<AdminDatabaseTable>> = {
  name: codeColumn({ id: "name", header: "Table", icon: <TableIcon />, sortable: true, locked: true, value: (table) => table.name, width: "max-w-64" }),
  schema: textColumn({ id: "schema", header: "Schéma", icon: <FolderIcon />, sortable: true, value: (table) => table.schema, muted: true }),
  page: customColumn({
    id: "page",
    header: "Page admin",
    icon: <LinkIcon />,
    cell: (table) => <LinkCell href={pageOf(table)?.href}>{pageOf(table)?.label}</LinkCell>,
    copy: (table) => pageOf(table)?.label ?? null,
  }),
  rows: numberColumn({ id: "rows", header: "Lignes (est.)", icon: <ListIcon />, sortable: true, value: (table) => table.rows, zero: true }),
  totalBytes: bytesColumn({ id: "totalBytes", header: "Poids total", icon: <HardDriveIcon />, sortable: true, value: (table) => table.totalBytes }),
  tableBytes: { ...bytesColumn({ id: "tableBytes", header: "Données", icon: <DatabaseIcon />, sortable: true, value: (table) => table.tableBytes }), extra: true },
  indexBytes: bytesColumn({ id: "indexBytes", header: "Index", icon: <ScanSearchIcon />, sortable: true, value: (table) => table.indexBytes }),
  columnsCount: numberColumn({ id: "columnsCount", header: "Colonnes", icon: <ColumnsIcon />, sortable: true, value: (table) => table.columns.length }),
  indexesCount: { ...numberColumn({ id: "indexesCount", header: "Nb d'index", icon: <KeyRoundIcon />, sortable: true, value: (table) => table.indexes.length }), extra: true },
  foreignKeysCount: numberColumn({ id: "foreignKeysCount", header: "Liens sortants", icon: <ArrowUpRightIcon />, sortable: true, value: (table) => table.foreignKeys.length }),
  referencedByCount: numberColumn({ id: "referencedByCount", header: "Liens entrants", icon: <ArrowDownLeftIcon />, sortable: true, value: (table) => table.referencedBy.length }),
  seqScans: { ...numberColumn({ id: "seqScans", header: "Parcours complets", icon: <ChartNoAxesColumnIcon />, sortable: true, value: (table) => table.seqScans }), extra: true },
  indexScans: { ...numberColumn({ id: "indexScans", header: "Lectures par index", icon: <ScanSearchIcon />, sortable: true, value: (table) => table.indexScans }), extra: true },
  inserts: { ...numberColumn({ id: "inserts", header: "Insertions", icon: <PlusIcon />, sortable: true, value: (table) => table.inserts }), extra: true },
  updates: { ...numberColumn({ id: "updates", header: "Mises à jour", icon: <PencilIcon />, sortable: true, value: (table) => table.updates }), extra: true },
  deletes: { ...numberColumn({ id: "deletes", header: "Suppressions", icon: <Trash2Icon />, sortable: true, value: (table) => table.deletes }), extra: true },
  deadRows: { ...numberColumn({ id: "deadRows", header: "Lignes mortes", icon: <SkullIcon />, sortable: true, value: (table) => table.deadRows }), extra: true },
  lastVacuum: dateColumn({ id: "lastVacuum", header: "Dernier vacuum", icon: <BrushCleaningIcon />, sortable: true, relative: true, value: (table) => table.lastVacuum }),
  lastAnalyze: { ...dateColumn({ id: "lastAnalyze", header: "Dernière analyse", icon: <ActivityIcon />, sortable: true, relative: true, value: (table) => table.lastAnalyze }), extra: true },
  extension: { ...textColumn({ id: "extension", header: "Extension", icon: <PuzzleIcon />, value: (table) => table.extension, muted: true }), extra: true },
  comment: { ...textColumn({ id: "comment", header: "Commentaire", icon: <FileTextIcon />, value: (table) => table.comment, width: "max-w-64" }), extra: true },
};

const IDS = Object.keys(COLUMNS) as Key[];

/** Read once per visit from the catalogs: served in pages by the browser. */
const sourceOf = (tables: AdminDatabaseTable[]) =>
  localTableSource(tables, {
    search: (table) => `${table.id} ${table.comment ?? ""} ${table.columns.map((column) => column.name).join(" ")}`,
    sorts: {
      name: (table) => table.name,
      schema: (table) => table.schema,
      rows: (table) => table.rows,
      totalBytes: (table) => table.totalBytes,
      tableBytes: (table) => table.tableBytes,
      indexBytes: (table) => table.indexBytes,
      columnsCount: (table) => table.columns.length,
      indexesCount: (table) => table.indexes.length,
      foreignKeysCount: (table) => table.foreignKeys.length,
      referencedByCount: (table) => table.referencedBy.length,
      seqScans: (table) => table.seqScans,
      indexScans: (table) => table.indexScans,
      inserts: (table) => table.inserts,
      updates: (table) => table.updates,
      deletes: (table) => table.deletes,
      deadRows: (table) => table.deadRows,
      lastVacuum: (table) => table.lastVacuum,
      lastAnalyze: (table) => table.lastAnalyze,
    },
    facets: {
      schema: { options: [...new Set(tables.map((table) => table.schema))], values: (table) => [table.schema] },
      page: { options: ["linked", "unlinked"], values: (table) => [pageOf(table) ? "linked" : "unlinked"] },
    },
    groupings: { schema: (table) => table.schema },
  });

/** Every table of the database, read only; a row opened in the side panel with its columns, indexes and links. */
export function DatabaseTable({ tables }: { tables: AdminDatabaseTable[] }) {
  const config = useMemo<DataTableConfig<AdminDatabaseTable>>(
    () => ({
      id: "database",
      fetch: sourceOf(tables),
      rowId: (table) => table.id,
      search: "Table, colonne ou commentaire",
      noun: (count) => (count > 1 ? "tables" : "table"),
      empty: { title: "Aucune table", description: "Les tables de la base apparaîtront ici." },
      columns: IDS.map((id) => COLUMNS[id]),
      defaultSort: { id: "totalBytes", desc: true },
      defaultFilters: { schema: ["public"] },
      facets: [
        { id: "schema", label: "Schéma", options: [...new Set(tables.map((table) => table.schema))].map((schema) => ({ value: schema, label: schema })) },
        {
          id: "page",
          label: "Page admin",
          options: [
            { value: "linked", label: "Avec une page" },
            { value: "unlinked", label: "Sans page" },
          ],
        },
      ],
      groupings: [{ id: "schema", label: "Schéma", title: (key) => key }],
      muted: (table) => table.extension !== null,
    }),
    [tables],
  );
  const load = useMemo(() => async (id: string) => tables.find((table) => table.id === id) ?? null, [tables]);
  const panel = useRowPanel<AdminDatabaseTable>({
    config,
    title: (table) => table.id,
    load,
    detail: (id, controls) => (
      <DetailLoader id={id} load={load} skeleton={<DetailSkeleton media sections={[6, 8, 6]} />}>
        {(table) => <TableDetail table={table} panel={controls} known={tables} />}
      </DetailLoader>
    ),
  });
  return <DataTable {...panel.table} />;
}

/** A table of the database: its figures, columns, indexes and links, read only. */
function TableDetail({ table, panel, known }: { table: AdminDatabaseTable; panel: RowPanelControls; known: AdminDatabaseTable[] }) {
  const open = (id: string) =>
    known.some((other) => other.id === id) && (
      <DetailItemButton label={`Ouvrir ${id}`} modifies={false} onClick={() => panel.open(id)}>
        <PanelRightOpenIcon aria-hidden />
      </DetailItemButton>
    );
  return (
    <>
      <DetailHeader media={<DetailMedia icon={<TableIcon />} />} title={table.name} subtitle={table.schema} />
      <DetailSection title="Table">
        <DetailColumnFields
          row={table}
          columns={IDS.map((id) => COLUMNS[id])}
          ids={["name", "schema", "page", "extension", { id: "comment", stacked: true }, "rows", "totalBytes", "tableBytes", "indexBytes"]}
        />
      </DetailSection>
      <DetailSection title="Activité depuis le dernier reset des statistiques">
        <DetailColumnFields
          row={table}
          columns={IDS.map((id) => COLUMNS[id])}
          ids={["seqScans", "indexScans", "inserts", "updates", "deletes", "deadRows", "lastVacuum", "lastAnalyze"]}
        />
      </DetailSection>
      <DetailSection title={`Colonnes (${table.columns.length})`}>
        <DetailItems>
          {table.columns.map((column) => (
            <DetailItem key={column.name} icon={column.primaryKey ? <KeyRoundIcon /> : <ColumnsIcon />}>
              <span className="font-mono text-xs">{column.name}</span>{" "}
              <span className="text-muted-foreground">
                {column.type}
                {column.nullable ? "" : " · non nul"}
                {column.default ? ` · défaut ${column.default}` : ""}
              </span>
            </DetailItem>
          ))}
        </DetailItems>
      </DetailSection>
      <DetailSection title={`Index (${table.indexes.length})`}>
        {table.indexes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun index.</p>
        ) : (
          <DetailItems>
            {table.indexes.map((index) => (
              <DetailItem key={index.name} icon={index.primary ? <KeyRoundIcon /> : <ScanSearchIcon />}>
                <span className="font-mono text-xs">{index.name}</span>{" "}
                <span className="text-muted-foreground">
                  {formatBytes(index.bytes)} · {formatNumber(index.scans)} lectures{index.unique ? " · unique" : ""}
                </span>
                <span className="block font-mono text-xs break-all text-muted-foreground">{index.definition}</span>
              </DetailItem>
            ))}
          </DetailItems>
        )}
      </DetailSection>
      <DetailSection title={`Liens sortants (${table.foreignKeys.length})`}>
        {table.foreignKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune clé étrangère.</p>
        ) : (
          <DetailItems>
            {table.foreignKeys.map((key) => (
              <DetailItem key={key.name} icon={<ArrowUpRightIcon />} actions={open(key.references)} floating>
                <span className="font-mono text-xs">{key.references}</span>
                <span className="block font-mono text-xs break-all text-muted-foreground">{key.definition}</span>
              </DetailItem>
            ))}
          </DetailItems>
        )}
      </DetailSection>
      <DetailSection title={`Liens entrants (${table.referencedBy.length})`}>
        {table.referencedBy.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune table ne pointe vers celle-ci.</p>
        ) : (
          <DetailItems>
            {table.referencedBy.map((id) => (
              <DetailItem key={id} icon={<LayoutListIcon />} actions={open(id)} floating>
                <span className="font-mono text-xs">{id}</span>
              </DetailItem>
            ))}
          </DetailItems>
        )}
      </DetailSection>
    </>
  );
}
