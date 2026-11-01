"use client";

import type { AdminReservedUsername } from "@kilotrace/shared/admin";
import { AtSignIcon, PencilIcon, StickyNoteIcon, Trash2Icon } from "lucide-react";
import {
  DetailAction,
  DetailActions,
  DetailColumnField,
  DetailField,
  DetailFields,
  DetailHeader,
  DetailLoader,
  DetailMedia,
  DetailSection,
  DetailSkeleton,
} from "@/components/admin/detail";
import { loadReservedUsername, saveReservedUsername } from "./actions";
import { bumpReserved, CATEGORIES, RESERVED_COLUMNS, useReservedDialogs, useReservedVersion } from "./reserved-bits";

/** The reserved username loaded by the panel, its skeleton meanwhile; loaded again after every change. */
export function ReservedRowPanel({ username, canEdit }: { username: string; canEdit: boolean }) {
  const version = useReservedVersion();
  return (
    <DetailLoader
      id={username}
      load={loadReservedUsername}
      refreshKey={version}
      skeleton={<DetailSkeleton actions={canEdit ? 2 : 0} sections={[5]} />}
    >
      {(entry) => <ReservedDetail entry={entry} canEdit={canEdit} />}
    </DetailLoader>
  );
}

/** Everything about a reserved username; `canEdit` edits and releases it. */
function ReservedDetail({ entry, canEdit }: { entry: AdminReservedUsername; canEdit: boolean }) {
  const { openEdit, openRelease, dialogs } = useReservedDialogs();
  const field = (id: string) => <DetailColumnField row={entry} columns={RESERVED_COLUMNS} id={id} />;
  const saveNote = async (note: string | null) => {
    const result = await saveReservedUsername(entry.username, { category: entry.category, note });
    if (result.ok) bumpReserved();
    return result;
  };
  return (
    <>
      <DetailHeader
        media={<DetailMedia icon={<AtSignIcon />} />}
        title={`@${entry.username}`}
        subtitle={CATEGORIES[entry.category].label}
      />
      {canEdit && (
        <DetailActions>
          <DetailAction label="Modifier" icon={<PencilIcon aria-hidden />} onClick={() => openEdit(entry)} />
          <DetailAction label="Supprimer" icon={<Trash2Icon aria-hidden />} variant="destructive" onClick={() => openRelease(entry.username)} />
        </DetailActions>
      )}
      {canEdit && dialogs}
      <DetailSection title="Pseudo">
        <DetailFields>
          {field("username")}
          {field("category")}
          {field("createdBy")}
          {field("createdAt")}
          {canEdit ? (
            <DetailField
              label="Note"
              icon={<StickyNoteIcon />}
              stacked
              edit={{ value: entry.note, multiline: true, placeholder: "Une note pour l'équipe", onSave: saveNote }}
            />
          ) : (
            <DetailField label="Note" icon={<StickyNoteIcon />} copy={entry.note} stacked={!!entry.note}>
              {entry.note && <span className="whitespace-pre-line">{entry.note}</span>}
            </DetailField>
          )}
        </DetailFields>
      </DetailSection>
    </>
  );
}
