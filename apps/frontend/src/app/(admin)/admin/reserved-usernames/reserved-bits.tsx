"use client";

import {
  type AdminReservedUsername,
  RESERVED_USERNAME_CATEGORIES,
  RESERVED_USERNAME_NOTE_MAX_LENGTH,
  type ReservedUsernameCategory,
} from "@kilotrace/shared/admin";
import { AtSignIcon, CalendarPlusIcon, ShapesIcon, StickyNoteIcon, UserPenIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { FormDialog } from "@/components/admin/form-dialog";
import { customColumn, type DataTableColumn, dateColumn, pillsColumn, textColumn, type Tone, UserCell } from "@/components/admin/data-table";
import { useSplitPanel } from "@/components/split-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { createVersion } from "@/lib/admin/version";
import { releaseUsername, updateReservedUsername } from "./actions";

/*
 * How a reserved username is drawn and changed, shared by its table and its detail.
 */

/** The version of the reserved usernames: the `refreshKey` of their table and of their detail. */
export const { useVersion: useReservedVersion, bump: bumpReserved } = createVersion();

export const CATEGORIES: Record<ReservedUsernameCategory, { label: string; tone: Tone }> = {
  system: { label: "Système", tone: "gray" },
  personality: { label: "Personnalité", tone: "violet" },
  brand: { label: "Marque", tone: "blue" },
  offensive: { label: "Injurieux", tone: "red" },
  other: { label: "Autre", tone: "amber" },
};

function Author({ entry }: { entry: AdminReservedUsername }) {
  if (!entry.createdBy) return <span className="text-muted-foreground">Liste initiale</span>;
  if (!entry.createdBy.username) return <span className="text-muted-foreground italic">Compte supprimé</span>;
  return <UserCell user={{ ...entry.createdBy, username: entry.createdBy.username }} />;
}

export const RESERVED_COLUMNS: DataTableColumn<AdminReservedUsername>[] = [
  textColumn({ id: "username", header: "Pseudo", icon: <AtSignIcon />, sortable: true, locked: true, value: (entry) => `@${entry.username}` }),
  pillsColumn({ id: "category", header: "Catégorie", icon: <ShapesIcon />, sortable: true, value: (entry) => [CATEGORIES[entry.category]] }),
  customColumn({
    id: "createdBy",
    header: "Ajouté par",
    icon: <UserPenIcon />,
    sortable: true,
    cell: (entry) => <Author entry={entry} />,
    copy: (entry) => entry.createdBy?.username ?? (entry.createdBy ? null : "Liste initiale"),
    skeleton: (
      <span className="flex items-center gap-2">
        <Skeleton className="size-5 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </span>
    ),
  }),
  dateColumn({ id: "createdAt", header: "Date", icon: <CalendarPlusIcon />, sortable: true, value: (entry) => entry.createdAt }),
  textColumn({ id: "note", header: "Note", icon: <StickyNoteIcon />, sortable: true, value: (entry) => entry.note, muted: true, width: "max-w-64" }),
];

export const noteField = (defaultValue?: string) =>
  ({ kind: "textarea", name: "note", label: "Note (optionnelle)", hint: "Visible par l'équipe seulement.", maxLength: RESERVED_USERNAME_NOTE_MAX_LENGTH, defaultValue }) as const;

export const categoryField = (defaultValue: ReservedUsernameCategory) =>
  ({
    kind: "select",
    name: "category",
    label: "Catégorie",
    defaultValue,
    options: RESERVED_USERNAME_CATEGORIES.map((value) => ({ value, label: CATEGORIES[value].label })),
  }) as const;

/**
 * The edit and the release of a reserved username, opened by a menu item or
 * a button of its detail; `dialogs` goes anywhere in the page. Once done, the
 * table and the detail fetch again; a released username open in the panel closes it.
 */
export function useReservedDialogs() {
  const { close, activeId } = useSplitPanel();
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [editing, setEditing] = useState<{ open: boolean; entry: AdminReservedUsername | null }>({ open: false, entry: null });
  const [releasing, setReleasing] = useState({ open: false, username: "" });
  const openEdit = useCallback((entry: AdminReservedUsername) => setEditing({ open: true, entry }), []);
  const openRelease = useCallback((username: string) => setReleasing({ open: true, username }), []);
  const dialogs = (
    <>
      <FormDialog
        key={editing.entry?.username ?? ""}
        open={editing.open}
        onOpenChange={(open) => setEditing({ ...editing, open })}
        onSuccess={bumpReserved}
        action={updateReservedUsername.bind(null, editing.entry?.username ?? "")}
        title={`Modifier @${editing.entry?.username ?? ""}`}
        description="Le pseudo reste désactivé ; seules sa catégorie et sa note changent."
        submitLabel="Enregistrer"
        cancelLabel="Annuler"
        fields={[categoryField(editing.entry?.category ?? "other"), noteField(editing.entry?.note ?? "")]}
      />
      <ActionDialog
        open={releasing.open}
        onOpenChange={(open) => setReleasing({ ...releasing, open })}
        onSuccess={() => {
          if (activeId === releasing.username) close();
          bumpReserved();
        }}
        action={releaseUsername.bind(null, releasing.username)}
        title={`Supprimer @${releasing.username} ?`}
        description="Le pseudo redeviendra disponible pour tout le monde."
        submitLabel="Supprimer"
        cancelLabel="Annuler"
        destructive
      />
    </>
  );
  return { openEdit, openRelease, dialogs };
}
