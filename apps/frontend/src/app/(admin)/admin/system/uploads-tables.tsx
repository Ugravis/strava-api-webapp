"use client";

import type { AdminUploadFile, AuditUser } from "@kilotrace/shared/admin";
import { AtSignIcon, CalendarClockIcon, ExternalLinkIcon, FileImageIcon, HardDriveIcon, ImageIcon, PanelRightOpenIcon } from "lucide-react";
import { useMemo } from "react";
import {
  bytesColumn,
  codeColumn,
  type DataTableColumn,
  type DataTableConfig,
  DataTable,
  dateColumn,
  formatBytes,
  imageColumn,
  localTableSource,
  userColumn,
} from "@/components/admin/data-table";
import {
  DetailAction,
  DetailActions,
  DetailColumnFields,
  DetailCover,
  DetailFieldButton,
  DetailHeader,
  DetailLoader,
  DetailMedia,
  DetailSection,
  DetailSkeleton,
  useRowPanel,
} from "@/components/admin/detail";
import { type OpenUser, useUserPanel } from "../users/use-user-panel";

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

/** Served by the public route of the avatars, orphans included. */
const srcOf = (file: AdminUploadFile) => `/api/${file.key}`;
const altOf = (file: AdminUploadFile) => (file.user?.username ? `Avatar de @${file.user.username}` : file.key);

/** Opens the owner of the file in the side panel, while the account exists. */
function ownerTool(user: AuditUser | null, openUser?: OpenUser) {
  const { username } = user ?? {};
  if (!user || !username || !openUser) return null;
  return (
    <DetailFieldButton label={`Ouvrir @${username}`} onClick={() => openUser({ id: user.id, username })}>
      <PanelRightOpenIcon aria-hidden />
    </DetailFieldButton>
  );
}

function columnsOf(openUser?: OpenUser): Record<"file" | "image" | "user" | "size" | "lastModified", DataTableColumn<AdminUploadFile>> {
  return {
    file: codeColumn({ id: "file", header: "Fichier", icon: <FileImageIcon />, sortable: true, locked: true, value: (file) => file.key, width: "max-w-64" }),
    image: imageColumn({ id: "image", header: "Image", icon: <ImageIcon />, value: (file) => ({ src: srcOf(file), alt: altOf(file) }) }),
    user: userColumn({ id: "user", header: "Compte", icon: <AtSignIcon />, sortable: true, locked: false, avatar: false, value: (file) => file.user, tools: (file) => ownerTool(file.user, openUser) }),
    size: bytesColumn({ id: "size", header: "Taille", icon: <HardDriveIcon />, sortable: true, value: (file) => file.bytes }),
    lastModified: dateColumn({ id: "lastModified", header: "Modifié", icon: <CalendarClockIcon />, sortable: true, time: true, value: (file) => file.lastModified }),
  };
}

const BASE = {
  rowId: (file: AdminUploadFile) => file.key,
  noun: (count: number) => (count > 1 ? "fichiers" : "fichier"),
  defaultSort: { id: "size", desc: true },
  views: [
    { id: "table", label: "Tableau" },
    { id: "cards", label: "Cartes", layout: "cards" },
  ],
} satisfies Partial<DataTableConfig<AdminUploadFile>>;

/**
 * A table of files opened in the side panel. Both tables share `?row=`:
 * a file is either used or orphan, so their keys never meet; each finds
 * its own among its rows.
 */
function useFilesPanel(config: DataTableConfig<AdminUploadFile>, files: AdminUploadFile[], ids: string[], openUser?: OpenUser) {
  const load = useMemo(() => async (key: string) => files.find((file) => file.key === key) ?? null, [files]);
  const columns = useMemo(() => columnsOf(openUser), [openUser]);
  return useRowPanel<AdminUploadFile>({
    config,
    title: (file) => file.key.split("/").pop() ?? file.key,
    load,
    detail: (key) => (
      <DetailLoader id={key} load={load} skeleton={<DetailSkeleton cover media actions={1} sections={[ids.length]} />}>
        {(file) => (
          <>
            <DetailCover image={{ src: srcOf(file), alt: altOf(file) }} />
            <DetailHeader media={<DetailMedia icon={<FileImageIcon />} />} title={file.key.split("/").pop() ?? file.key} subtitle={formatBytes(file.bytes)} />
            <DetailActions>
              <DetailAction label="Ouvrir le fichier" icon={<ExternalLinkIcon aria-hidden />} href={srcOf(file)} />
            </DetailActions>
            <DetailSection title="Fichier">
              <DetailColumnFields row={file} columns={Object.values(columns)} ids={ids} />
            </DetailSection>
          </>
        )}
      </DetailLoader>
    ),
  });
}

/** The heaviest avatars still used by an account, their owner opened in the side panel. */
export function HeaviestTable({ files }: { files: AdminUploadFile[] }) {
  const openUser = useUserPanel();
  const config = useMemo<DataTableConfig<AdminUploadFile>>(() => {
    const columns = columnsOf(openUser);
    return {
      ...BASE,
      id: "heaviest",
      fetch: sourceOf(files),
      search: "Fichier ou @username",
      empty: { title: "Aucun avatar importé", description: "Les avatars importés par les comptes apparaîtront ici." },
      columns: [columns.file, columns.image, columns.user, columns.size, columns.lastModified],
    };
  }, [files, openUser]);
  const panel = useFilesPanel(config, files, ["file", "user", "size", "lastModified"], openUser);
  return <DataTable {...panel.table} />;
}

/** Avatars no account points to any more, the first ones listed by the API. */
export function OrphansTable({ files }: { files: AdminUploadFile[] }) {
  const config = useMemo<DataTableConfig<AdminUploadFile>>(() => {
    const columns = columnsOf();
    return {
      ...BASE,
      id: "orphans",
      fetch: sourceOf(files),
      search: "Fichier",
      empty: { title: "Aucun fichier orphelin", description: "Chaque avatar stocké est utilisé par un compte." },
      columns: [columns.file, columns.image, columns.size, columns.lastModified],
    };
  }, [files]);
  const panel = useFilesPanel(config, files, ["file", "size", "lastModified"]);
  return <DataTable {...panel.table} />;
}
