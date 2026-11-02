"use client";

import { type AdminReservedUsername, RESERVED_USERNAME_RULES } from "@kilotrace/shared/admin";
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@kilotrace/shared";
import { AtSignIcon, CopyPlusIcon, Trash2Icon } from "lucide-react";
import { useMemo } from "react";
import {
  DetailAction,
  DetailActions,
  DetailColumnFields,
  DetailField,
  DetailFields,
  DetailForm,
  DetailHeader,
  DetailLoader,
  DetailMedia,
  DetailSection,
  DetailSkeleton,
  type RowPanelControls,
} from "@/components/admin/detail";
import { createReservedUsername, loadReservedUsername, type ReservedDraft } from "./actions";
import { bumpReserved, CATEGORIES, CATEGORY_OPTIONS, releaseOf, RESERVED_LOCK, reservedColumns, useReservedVersion } from "./reserved-bits";

const BLANK: ReservedDraft = { username: null, category: "other", note: null };

/** The reserved username loaded by the panel, its skeleton meanwhile; loaded again after every change. */
export function ReservedRowPanel({ username, canEdit, panel }: { username: string; canEdit: boolean; panel: RowPanelControls }) {
  const version = useReservedVersion();
  return (
    <DetailLoader id={username} load={loadReservedUsername} refreshKey={version} skeleton={<DetailSkeleton media actions={2} sections={[5]} />}>
      {(entry) => <ReservedDetail entry={entry} canEdit={canEdit} panel={panel} />}
    </DetailLoader>
  );
}

/** Everything about a reserved username; its username, category and note edited in place, `canEdit` or locked. */
function ReservedDetail({ entry, canEdit, panel }: { entry: AdminReservedUsername; canEdit: boolean; panel: RowPanelControls }) {
  const columns = useMemo(() => reservedColumns(canEdit, panel.renamed), [canEdit, panel.renamed]);
  const locked = canEdit ? null : RESERVED_LOCK;
  const release = releaseOf(entry, () => panel.removed(entry.username));
  return (
    <>
      <DetailHeader media={<DetailMedia icon={<AtSignIcon />} />} title={`@${entry.username}`} subtitle={CATEGORIES[entry.category].label} />
      <DetailActions>
        <DetailAction
          label="Dupliquer"
          icon={<CopyPlusIcon aria-hidden />}
          locked={locked}
          onClick={() => panel.create({ category: entry.category, note: entry.note } satisfies Partial<ReservedDraft>)}
        />
        <DetailAction
          label="Supprimer"
          icon={<Trash2Icon aria-hidden />}
          variant="destructive"
          locked={locked}
          confirm={release.confirm}
          onClick={release.run}
        />
      </DetailActions>
      <DetailSection title="Pseudo">
        <DetailColumnFields row={entry} columns={columns} ids={["username", "category", "createdBy", "createdAt", { id: "note", stacked: true }]} />
      </DetailSection>
    </>
  );
}

/** A username to reserve, blank or copied: nothing saved before « Réserver ». */
export function ReservedCreate({ initial, onCancel, onCreated }: { initial?: Partial<ReservedDraft>; onCancel: () => void; onCreated: (username: string) => void }) {
  const columns = useMemo(() => reservedColumns(true), []);
  return (
    <DetailForm<ReservedDraft>
      initial={{ ...BLANK, ...initial }}
      rules={RESERVED_USERNAME_RULES}
      onSubmit={async (draft) => {
        const result = await createReservedUsername(draft);
        if (result.ok) bumpReserved();
        return result;
      }}
      onCancel={onCancel}
      onCreated={(created) => onCreated(created.id!)}
      submitLabel="Réserver"
    >
      {(form) => (
        <>
          <DetailHeader
            media={<DetailMedia icon={<AtSignIcon />} />}
            title={form.values.username?.trim() ? `@${form.values.username.trim().toLowerCase()}` : "Nouveau pseudo"}
            subtitle="Personne ne pourra plus le prendre. Un pseudo porté par un compte ne peut pas être réservé : modérez d'abord le profil."
          />
          <DetailSection title="Pseudo">
            <DetailFields>
              <DetailField
                label="Pseudo"
                icon={<AtSignIcon />}
                edit={form.bind("username", { kind: "text", placeholder: `${USERNAME_MIN_LENGTH} à ${USERNAME_MAX_LENGTH} caractères : minuscules, chiffres et _` })}
              />
            </DetailFields>
            <DetailColumnFields
              columns={columns}
              ids={[
                { id: "category", edit: form.bind("category", { kind: "select", options: CATEGORY_OPTIONS }) },
                { id: "note", stacked: true, edit: form.bind("note", { kind: "text", multiline: true, placeholder: "Visible par l'équipe seulement" }) },
              ]}
            />
          </DetailSection>
        </>
      )}
    </DetailForm>
  );
}
