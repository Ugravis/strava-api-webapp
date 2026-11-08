"use client";

import { ADMIN_REASON_MAX_LENGTH, ADMIN_REASON_MIN_LENGTH, type AdminUserTag, type UpdateUserTagRequest, USER_TAG_RULES } from "@kilotrace/shared/admin";
import { BotIcon, CalendarPlusIcon, FingerprintIcon, PaletteIcon, ShapesIcon, SmileIcon, StickyNoteIcon, TagIcon, UsersIcon } from "lucide-react";
import {
  codeColumn,
  type ConfirmOptions,
  type DataTableColumn,
  dateColumn,
  editColumn,
  lookColumn,
  Mark,
  numberColumn,
  orderColumn,
  statusColumn,
  textColumn,
} from "@kilotrace/ui/components/admin/data-table";
import { fromRule } from "@kilotrace/ui/components/admin/detail";
import { BadgeIcon } from "@kilotrace/ui/components/distances/badge-icon";
import { createVersion } from "@/lib/admin/version";
import { deleteUserTag, saveUserTag } from "./actions";

/*
 * How a user tag is drawn and changed, shared by its table and its detail.
 */

/** The version of the user tags: the `refreshKey` of their table and of their detail. */
export const { useVersion: useUserTagsVersion, bump: bumpUserTags } = createVersion();

/** What the permissions of the current member allow on the user tags. */
export interface UserTagRights {
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export const KINDS = {
  system: { label: "Automatique", tone: "violet" },
  custom: { label: "Manuel", tone: "gray" },
} as const;

/** The locks of the fields and buttons, for a member without the permission. */
export const LOCKS = {
  create: "Réservé aux membres qui créent les tags",
  edit: "Réservé aux membres qui modifient les tags",
  delete: "Réservé aux membres qui suppriment les tags",
  system: "Attribué par l'application : jamais supprimé",
};

/** Saves a change of a user tag, every field sent; the table and the detail fetch again. */
export async function saveTag(userTag: AdminUserTag, patch: Partial<UpdateUserTagRequest>) {
  const { name, description, icon, color } = userTag;
  const result = await saveUserTag(userTag.id, { name, description, icon, color, ...patch });
  if (result.ok) bumpUserTags();
  return result;
}

/** Why `userTag` may not be deleted by this member, or null. */
export const deleteLock = (userTag: AdminUserTag, rights: UserTagRights) => (userTag.system ? LOCKS.system : rights.delete ? null : LOCKS.delete);

/** The deletion of a user tag, asked first with a reason and its id typed: by its detail or the menu of its row. `done` once deleted. */
export function deleteOf(userTag: AdminUserTag, done: () => void): { confirm: ConfirmOptions; run: (reason: string | undefined) => Promise<unknown> } {
  return {
    confirm: {
      title: `Supprimer ${userTag.name} ?`,
      description: "Définitif : le tag disparaît de tous les profils qui l'affichent.",
      confirmLabel: "Supprimer",
      reason: {
        label: "Raison",
        placeholder: "Expliquez la décision, elle est consignée dans le journal.",
        required: true,
        minLength: ADMIN_REASON_MIN_LENGTH,
        maxLength: ADMIN_REASON_MAX_LENGTH,
        presets: ["Tag obsolète", "Doublon", "Créé par erreur"],
      },
      typed: { label: `Tapez ${userTag.id} pour confirmer`, expected: userTag.id },
    },
    run: async (reason) => {
      const result = await deleteUserTag(userTag.id, reason);
      if (result.ok) {
        bumpUserTags();
        done();
      }
      return result;
    },
  };
}

export const SystemMark = () => <Mark label="Attribué par l'application : modifiable, jamais supprimé" tone="violet" icon={<BotIcon />} />;

/** The columns; `edit` edits the description, the icon and the colour in place, in the table and in the detail. */
export const userTagColumns = (edit: boolean): DataTableColumn<AdminUserTag>[] => [
  orderColumn({ id: "position", header: "Ordre", value: (userTag) => userTag.position }),
  lookColumn({
    id: "name",
    header: "Tag",
    icon: <TagIcon />,
    sortable: true,
    value: (userTag) => ({ icon: <BadgeIcon icon={userTag.icon} strokeWidth={1.75} />, name: userTag.name, color: userTag.color }),
    marks: (userTag) => userTag.system && <SystemMark />,
  }),
  codeColumn({ id: "id", header: "Identifiant", icon: <FingerprintIcon />, sortable: true, value: (userTag) => userTag.id }),
  textColumn({
    id: "description",
    header: "Description",
    icon: <StickyNoteIcon />,
    value: (userTag) => userTag.description,
    muted: true,
    width: "max-w-80",
    edit: (userTag) => ({
      kind: "text",
      ...fromRule(USER_TAG_RULES.description),
      value: userTag.description,
      multiline: true,
      placeholder: "Affichée dans le détail du tag",
      locked: edit ? null : LOCKS.edit,
      onSave: (description) => saveTag(userTag, { description: description?.trim() || null }),
    }),
  }),
  editColumn({
    id: "icon",
    header: "Icône",
    icon: <SmileIcon />,
    edit: (userTag) => ({
      kind: "icon",
      ...fromRule(USER_TAG_RULES.icon),
      value: userTag.icon,
      locked: edit ? null : LOCKS.edit,
      onSave: (icon) => saveTag(userTag, { icon: icon ?? userTag.icon }),
    }),
  }),
  editColumn({
    id: "color",
    header: "Couleur",
    icon: <PaletteIcon />,
    edit: (userTag) => ({
      kind: "color",
      value: userTag.color,
      noneLabel: "Couleur par défaut",
      locked: edit ? null : LOCKS.edit,
      onSave: (color) => saveTag(userTag, { color }),
    }),
  }),
  statusColumn({ id: "kind", header: "Attribution", icon: <ShapesIcon />, value: (userTag) => (userTag.system ? "system" : "custom"), statuses: KINDS }),
  numberColumn({ id: "holders", header: "Membres", icon: <UsersIcon />, sortable: true, value: (userTag) => userTag.holdersCount }),
  dateColumn({ id: "createdAt", header: "Création", icon: <CalendarPlusIcon />, sortable: true, value: (userTag) => userTag.createdAt }),
];
