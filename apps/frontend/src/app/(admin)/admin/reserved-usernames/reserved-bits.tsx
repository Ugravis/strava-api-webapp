"use client";

import {
  type AdminReservedUsername,
  RESERVED_USERNAME_CATEGORIES,
  RESERVED_USERNAME_RULES,
  type ReservedUsernameCategory,
  type UpdateReservedUsernameRequest,
} from "@kilotrace/shared/admin";
import { AtSignIcon, CalendarPlusIcon, ShapesIcon, StickyNoteIcon, UserPenIcon } from "lucide-react";
import { type ConfirmOptions, customColumn, type DataTableColumn, dateColumn, pillsColumn, textColumn, type Tone, UserCell } from "@kilotrace/ui/components/admin/data-table";
import { type DetailEditOption, fromRule } from "@kilotrace/ui/components/admin/detail";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";
import { createVersion } from "@/lib/admin/version";
import { releaseUsername, saveReservedUsername } from "./actions";

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

export const CATEGORY_OPTIONS: DetailEditOption[] = RESERVED_USERNAME_CATEGORIES.map((value) => ({ value, ...CATEGORIES[value] }));

/** The lock of the fields and buttons for a member without the permission. */
export const RESERVED_LOCK = "Réservé aux membres qui gèrent les pseudos";

/** Saves a change of a reserved username, every field sent; the table and the detail fetch again. */
export async function saveReserved(entry: AdminReservedUsername, patch: Partial<UpdateReservedUsernameRequest>) {
  const result = await saveReservedUsername(entry.username, { category: entry.category, note: entry.note, ...patch });
  if (result.ok) bumpReserved();
  return result;
}

/** The removal of a reserved username, asked first: by its detail or the menu of its row. `done` once released. */
export function releaseOf(entry: AdminReservedUsername, done: () => void): { confirm: ConfirmOptions; run: () => Promise<unknown> } {
  return {
    confirm: { title: `Supprimer @${entry.username} ?`, description: "Le pseudo redeviendra disponible pour tout le monde.", confirmLabel: "Supprimer" },
    run: async () => {
      const result = await releaseUsername(entry.username);
      if (result.ok) {
        bumpReserved();
        done();
      }
      return result;
    },
  };
}

function Author({ entry }: { entry: AdminReservedUsername }) {
  if (!entry.createdBy) return <span className="text-muted-foreground">Liste initiale</span>;
  if (!entry.createdBy.username) return <span className="text-muted-foreground italic">Compte supprimé</span>;
  return <UserCell user={{ ...entry.createdBy, username: entry.createdBy.username }} />;
}

/**
 * The columns; `canEdit` edits the username, the category and the note in
 * place, in the table and in the detail. `renamed` once a username changed,
 * for the panel to follow it.
 */
export const reservedColumns = (canEdit: boolean, renamed?: (from: string, to: string) => void): DataTableColumn<AdminReservedUsername>[] => [
  textColumn({
    id: "username",
    header: "Pseudo",
    icon: <AtSignIcon />,
    sortable: true,
    locked: true,
    value: (entry) => `@${entry.username}`,
    edit: (entry) => ({
      kind: "text",
      ...fromRule(RESERVED_USERNAME_RULES.username),
      value: entry.username,
      locked: canEdit ? null : RESERVED_LOCK,
      onSave: async (next) => {
        const username = (next ?? "").trim().toLowerCase();
        const result = await saveReserved(entry, { username });
        if (result.ok) renamed?.(entry.username, username);
        return result;
      },
    }),
  }),
  pillsColumn({
    id: "category",
    header: "Catégorie",
    icon: <ShapesIcon />,
    sortable: true,
    value: (entry) => [CATEGORIES[entry.category]],
    edit: (entry) => ({
      kind: "select",
      ...fromRule(RESERVED_USERNAME_RULES.category),
      value: entry.category,
      options: CATEGORY_OPTIONS,
      locked: canEdit ? null : RESERVED_LOCK,
      onSave: (category) => saveReserved(entry, { category: category as ReservedUsernameCategory }),
    }),
  }),
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
  textColumn({
    id: "note",
    header: "Note",
    icon: <StickyNoteIcon />,
    sortable: true,
    value: (entry) => entry.note,
    muted: true,
    width: "max-w-64",
    edit: (entry) => ({
      kind: "text",
      ...fromRule(RESERVED_USERNAME_RULES.note),
      value: entry.note,
      multiline: true,
      placeholder: "Une note pour l'équipe",
      locked: canEdit ? null : RESERVED_LOCK,
      onSave: (note) => saveReserved(entry, { note }),
    }),
  }),
];
