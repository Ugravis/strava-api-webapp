"use client";

import {
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
  ADMIN_USER_TAG_DESCRIPTION_MAX_LENGTH,
  ADMIN_USER_TAG_ID_MAX_LENGTH,
  ADMIN_USER_TAG_NAME_MAX_LENGTH,
  type AdminUserTag,
} from "@kilotrace/shared/admin";
import { BotIcon, CalendarPlusIcon, FingerprintIcon, ShapesIcon, StickyNoteIcon, TagIcon, UsersIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { FormDialog } from "@/components/admin/form-dialog";
import { codeColumn, type DataTableColumn, dateColumn, lookColumn, Mark, numberColumn, orderColumn, statusColumn, textColumn } from "@/components/admin/data-table";
import { BADGE_ICON_KEYS, BadgeIcon } from "@/components/distances/badge-icon";
import { useSplitPanel } from "@/components/split-panel";
import { createVersion } from "@/lib/admin/version";
import { createUserTag, deleteUserTag, updateUserTag } from "./actions";

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

/** Pattern of the slugs, for the browser; the backend checks it again. */
const SLUG_PATTERN = "[a-z0-9]+(_[a-z0-9]+)*";

export const SystemMark = () => <Mark label="Attribué par l'application : modifiable, jamais supprimé" tone="violet" icon={<BotIcon />} />;

export const USER_TAG_COLUMNS: DataTableColumn<AdminUserTag>[] = [
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
  textColumn({ id: "description", header: "Description", icon: <StickyNoteIcon />, value: (userTag) => userTag.description, muted: true, width: "max-w-80" }),
  statusColumn({ id: "kind", header: "Attribution", icon: <ShapesIcon />, value: (userTag) => (userTag.system ? "system" : "custom"), statuses: KINDS }),
  numberColumn({ id: "holders", header: "Membres", icon: <UsersIcon />, sortable: true, value: (userTag) => userTag.holdersCount }),
  dateColumn({ id: "createdAt", header: "Création", icon: <CalendarPlusIcon />, sortable: true, value: (userTag) => userTag.createdAt }),
];

/**
 * The creation, the edit and the deletion of a user tag, opened by the
 * table or a button of its detail; `dialogs` goes anywhere in the page. Once
 * done, the table and the detail fetch again; a deleted tag open in the panel closes it.
 */
export function useUserTagDialogs(rights: UserTagRights) {
  const { close, activeId } = useSplitPanel();
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [editing, setEditing] = useState<{ open: boolean; userTag: AdminUserTag | null }>({ open: false, userTag: null });
  const [deleting, setDeleting] = useState<{ open: boolean; userTag: AdminUserTag | null }>({ open: false, userTag: null });
  /** `null` creates one. */
  const openEdit = useCallback((userTag: AdminUserTag | null) => setEditing({ open: true, userTag }), []);
  const openDelete = useCallback((userTag: AdminUserTag) => setDeleting({ open: true, userTag }), []);

  const userTag = editing.userTag;
  const removed = deleting.userTag?.id ?? "";
  const dialogs = (
    <>
      {(rights.create || rights.edit) && (
        <FormDialog
          // Remounted per tag, so that the fields start from its values.
          key={userTag?.id ?? "new"}
          open={editing.open}
          onOpenChange={(open) => setEditing({ ...editing, open })}
          onSuccess={bumpUserTags}
          action={userTag ? updateUserTag.bind(null, userTag.id) : createUserTag}
          title={userTag ? `Modifier ${userTag.name}` : "Nouveau tag"}
          description={
            userTag ? "Le changement s'applique à tous les profils qui l'affichent." : "Ajouté en fin de liste, attribué ensuite depuis la fiche d'un utilisateur."
          }
          submitLabel={userTag ? "Enregistrer" : "Créer"}
          cancelLabel="Annuler"
          fields={[
            {
              kind: "text",
              name: "id",
              label: "Identifiant",
              hint: userTag ? undefined : "Minuscules, chiffres et _ ; définitif.",
              defaultValue: userTag?.id,
              required: true,
              maxLength: ADMIN_USER_TAG_ID_MAX_LENGTH,
              pattern: SLUG_PATTERN,
              readOnly: Boolean(userTag),
              half: true,
            },
            { kind: "text", name: "name", label: "Nom", defaultValue: userTag?.name, required: true, maxLength: ADMIN_USER_TAG_NAME_MAX_LENGTH, half: true },
            {
              kind: "textarea",
              name: "description",
              label: "Description",
              hint: "Facultative, affichée dans le détail du tag.",
              defaultValue: userTag?.description ?? undefined,
              maxLength: ADMIN_USER_TAG_DESCRIPTION_MAX_LENGTH,
            },
            { kind: "color", name: "color", label: "Couleur de l'icône", noneLabel: "Couleur par défaut", defaultValue: userTag?.color ?? null },
            {
              kind: "icons",
              name: "icon",
              label: "Icône",
              defaultValue: userTag?.icon ?? BADGE_ICON_KEYS[0],
              options: BADGE_ICON_KEYS.map((value) => ({ value, label: value, icon: <BadgeIcon icon={value} /> })),
            },
          ]}
        />
      )}
      {rights.delete && (
        <ActionDialog
          open={deleting.open}
          onOpenChange={(open) => setDeleting({ ...deleting, open })}
          onSuccess={() => {
            if (activeId === removed) close();
            bumpUserTags();
          }}
          action={deleteUserTag.bind(null, removed)}
          title={`Supprimer ${deleting.userTag?.name ?? ""} ?`}
          description="Définitif : le tag disparaît de tous les profils qui l'affichent."
          submitLabel="Supprimer"
          cancelLabel="Annuler"
          destructive
          reason={{
            label: "Raison",
            placeholder: "Expliquez la décision, elle est consignée dans le journal.",
            hint: `Entre ${ADMIN_REASON_MIN_LENGTH} et ${ADMIN_REASON_MAX_LENGTH} caractères.`,
            presetsLabel: "Raisons fréquentes",
            presets: ["Tag obsolète", "Doublon", "Créé par erreur"],
            required: true,
            min: ADMIN_REASON_MIN_LENGTH,
            max: ADMIN_REASON_MAX_LENGTH,
          }}
          confirmation={{ label: `Tapez ${removed} pour confirmer`, expected: removed }}
        />
      )}
    </>
  );
  return { openEdit, openDelete, dialogs };
}
