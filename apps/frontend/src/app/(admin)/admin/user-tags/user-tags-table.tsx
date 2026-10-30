"use client";

import {
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
  ADMIN_USER_TAG_DESCRIPTION_MAX_LENGTH,
  ADMIN_USER_TAG_ID_MAX_LENGTH,
  ADMIN_USER_TAG_NAME_MAX_LENGTH,
  type AdminUserTag,
} from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { BotIcon, CalendarPlusIcon, CopyIcon, FingerprintIcon, PencilIcon, ShapesIcon, StickyNoteIcon, TagIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionDialog } from "@/components/admin/action-dialog";
import { FormDialog } from "@/components/admin/form-dialog";
import {
  codeColumn,
  DataTable,
  type DataTableConfig,
  dateColumn,
  lookColumn,
  Mark,
  numberColumn,
  orderColumn,
  RowActions,
  statusColumn,
  textColumn,
} from "@/components/admin/data-table";
import { BADGE_ICON_KEYS, BadgeIcon } from "@/components/distances/badge-icon";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { createUserTag, deleteUserTag, fetchUserTagsTable, moveUserTag, updateUserTag } from "./actions";

/** What the permissions of the current member allow on the user tags. */
export interface UserTagRights {
  create: boolean;
  edit: boolean;
  delete: boolean;
}

const KINDS = {
  system: { label: "Automatique", tone: "violet" },
  custom: { label: "Manuel", tone: "gray" },
} as const;

/** Pattern of the slugs, for the browser; the backend checks it again. */
const SLUG_PATTERN = "[a-z0-9]+(_[a-z0-9]+)*";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/** The user tags, in the order of the profiles; rows move by their handle. Those awarded by the code are never deleted. */
export function UserTagsTable({ rights }: { rights: UserTagRights }) {
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [editing, setEditing] = useState<{ open: boolean; userTag: AdminUserTag | null }>({ open: false, userTag: null });
  const [deleting, setDeleting] = useState<{ open: boolean; userTag: AdminUserTag | null }>({ open: false, userTag: null });
  // Each change gives a new source, fetched again.
  const [version, setVersion] = useState(0);
  const changed = () => setVersion((each) => each + 1);

  const config = useMemo<DataTableConfig<AdminUserTag>>(
    () => ({
      id: "tags",
      fetch: (query: TableQuery) => fetchUserTagsTable(query),
      rowId: (userTag) => userTag.id,
      search: "Nom, identifiant ou description",
      noun: (total) => (total > 1 ? "tags" : "tag"),
      empty: { title: "Aucun tag", description: "Les tags apparaîtront ici dès leur création." },
      defaultSort: { id: "position", desc: false },
      maxHeight: "none",
      views: [
        { id: "table", label: "Tableau", columns: ["position", "name", "description", "kind", "holders"] },
        { id: "cards", label: "Cartes", layout: "cards", columns: ["position", "name", "description", "kind", "holders"] },
      ],
      columns: [
        orderColumn({ id: "position", header: "Ordre", value: (userTag) => userTag.position }),
        lookColumn({
          id: "name",
          header: "Tag",
          icon: <TagIcon />,
          sortable: true,
          value: (userTag) => ({ icon: <BadgeIcon icon={userTag.icon} strokeWidth={1.75} />, name: userTag.name, color: userTag.color }),
          marks: (userTag) => userTag.system && <Mark label="Attribué par l'application : modifiable, jamais supprimé" tone="violet" icon={<BotIcon />} />,
        }),
        codeColumn({ id: "id", header: "Identifiant", icon: <FingerprintIcon />, sortable: true, value: (userTag) => userTag.id }),
        textColumn({ id: "description", header: "Description", icon: <StickyNoteIcon />, value: (userTag) => userTag.description, muted: true, width: "max-w-80" }),
        statusColumn({ id: "kind", header: "Attribution", icon: <ShapesIcon />, value: (userTag) => (userTag.system ? "system" : "custom"), statuses: KINDS }),
        numberColumn({ id: "holders", header: "Membres", icon: <UsersIcon />, sortable: true, value: (userTag) => userTag.holdersCount }),
        dateColumn({ id: "createdAt", header: "Création", icon: <CalendarPlusIcon />, sortable: true, value: (userTag) => userTag.createdAt }),
      ],
      facets: [{ id: "kind", label: "Attribution", options: Object.entries(KINDS).map(([value, { label }]) => ({ value, label })) }],
      groupings: [{ id: "kind", label: "Attribution", title: (key) => KINDS[key as keyof typeof KINDS]?.label ?? key }],
      ...(rights.create && { create: { label: "Nouveau", onClick: () => setEditing({ open: true, userTag: null }) } }),
      ...(rights.edit && { reorder: moveUserTag }),
      actions: (userTag) => (
        <RowActions label={`Actions de ${userTag.name}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => copy(userTag.id, "Identifiant copié")}>
              <CopyIcon />
              Copier l&apos;identifiant
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {rights.edit && (
            <DropdownMenuItem onClick={() => setEditing({ open: true, userTag })}>
              <PencilIcon />
              Modifier
            </DropdownMenuItem>
          )}
          {rights.delete && !userTag.system && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting({ open: true, userTag })}>
                <Trash2Icon />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </RowActions>
      ),
    }),
    // `version` gives a new source, fetched again, after each change.
    [rights, version],
  );

  const userTag = editing.userTag;
  const removed = deleting.userTag?.id ?? "";
  return (
    <>
      <DataTable config={config} />
      {(rights.create || rights.edit) && (
        <FormDialog
          // Remounted per tag, so that the fields start from its values.
          key={userTag?.id ?? "new"}
          open={editing.open}
          onOpenChange={(open) => setEditing({ ...editing, open })}
          onSuccess={changed}
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
          onSuccess={changed}
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
}
