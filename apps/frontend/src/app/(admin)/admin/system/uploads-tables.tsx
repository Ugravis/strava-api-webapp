"use client";

import type { AdminUploadFile } from "@kilotrace/shared/admin";
import { AtSignIcon, CalendarClockIcon, FileImageIcon, HardDriveIcon } from "lucide-react";
import { useMemo } from "react";
import {
  bytesColumn,
  codeColumn,
  type DataTableColumn,
  type DataTableConfig,
  DataTable,
  dateColumn,
  localTableSource,
  userColumn,
} from "@/components/admin/data-table";

/** Read from the storage on each visit, the files come whole: served in pages by the browser. */
const sourceOf = (files: AdminUploadFile[]) =>
  localTableSource(files, {
    search: (file) => `${file.key} ${file.user?.username ?? ""} ${file.user?.displayName ?? ""}`,
    sorts: {
      file: (file) => file.key,
      user: (file) => file.user?.username ?? null,
      size: (file) => file.bytes,
      lastModified: (file) => file.lastModified,
    },
  });

const COLUMNS: Record<"file" | "user" | "size" | "lastModified", DataTableColumn<AdminUploadFile>> = {
  file: codeColumn({ id: "file", header: "Fichier", icon: <FileImageIcon />, sortable: true, locked: true, value: (file) => file.key, width: "max-w-64" }),
  user: userColumn({ id: "user", header: "Compte", icon: <AtSignIcon />, sortable: true, locked: false, value: (file) => file.user }),
  size: bytesColumn({ id: "size", header: "Taille", icon: <HardDriveIcon />, sortable: true, value: (file) => file.bytes }),
  lastModified: dateColumn({ id: "lastModified", header: "Modifié", icon: <CalendarClockIcon />, sortable: true, time: true, value: (file) => file.lastModified }),
};

const BASE = {
  rowId: (file: AdminUploadFile) => file.key,
  noun: (count: number) => (count > 1 ? "fichiers" : "fichier"),
  defaultSort: { id: "size", desc: true },
} satisfies Partial<DataTableConfig<AdminUploadFile>>;

/** The heaviest avatars still used by an account. */
export function HeaviestTable({ files }: { files: AdminUploadFile[] }) {
  const config = useMemo<DataTableConfig<AdminUploadFile>>(
    () => ({
      ...BASE,
      id: "heaviest",
      fetch: sourceOf(files),
      search: "Fichier ou @username",
      empty: { title: "Aucun avatar importé", description: "Les avatars importés par les comptes apparaîtront ici." },
      columns: [COLUMNS.file, COLUMNS.user, COLUMNS.size, COLUMNS.lastModified],
    }),
    [files],
  );
  return <DataTable config={config} />;
}

/** Avatars no account points to any more, the first ones listed by the API. */
export function OrphansTable({ files }: { files: AdminUploadFile[] }) {
  const config = useMemo<DataTableConfig<AdminUploadFile>>(
    () => ({
      ...BASE,
      id: "orphans",
      fetch: sourceOf(files),
      search: "Fichier",
      empty: { title: "Aucun fichier orphelin", description: "Chaque avatar stocké est utilisé par un compte." },
      columns: [COLUMNS.file, COLUMNS.size, COLUMNS.lastModified],
    }),
    [files],
  );
  return <DataTable config={config} />;
}
