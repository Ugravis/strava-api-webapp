"use client";

import type { AdminUserTag } from "@kilotrace/shared/admin";
import { ArrowDownUpIcon, PaletteIcon, PencilIcon, ShapesIcon, StickyNoteIcon, Trash2Icon, TypeIcon } from "lucide-react";
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
import { BadgeIcon } from "@/components/distances/badge-icon";
import { cn } from "@/lib/utils";
import { loadUserTag, saveUserTag } from "./actions";
import { bumpUserTags, SystemMark, USER_TAG_COLUMNS, type UserTagRights, useUserTagDialogs, useUserTagsVersion } from "./user-tag-bits";

/** The user tag loaded by the panel, its skeleton meanwhile; loaded again after every change. */
export function UserTagRowPanel({ id, rights }: { id: string; rights: UserTagRights }) {
  const version = useUserTagsVersion();
  return (
    <DetailLoader id={id} load={loadUserTag} refreshKey={version} skeleton={<DetailSkeleton actions={rights.edit ? 2 : 0} sections={[7, 2]} />}>
      {(userTag) => <UserTagDetail userTag={userTag} rights={rights} />}
    </DetailLoader>
  );
}

/** Everything about a user tag, and what the rights allow on it; those of the code are never deleted. */
function UserTagDetail({ userTag, rights }: { userTag: AdminUserTag; rights: UserTagRights }) {
  const { openEdit, openDelete, dialogs } = useUserTagDialogs(rights);
  const field = (id: string) => <DetailColumnField row={userTag} columns={USER_TAG_COLUMNS} id={id} />;
  const save = async (patch: Partial<Pick<AdminUserTag, "name" | "description">>) => {
    const result = await saveUserTag(userTag.id, { name: userTag.name, description: userTag.description, icon: userTag.icon, color: userTag.color, ...patch });
    if (result.ok) bumpUserTags();
    return result;
  };
  const deletable = rights.delete && !userTag.system;
  const icon = <BadgeIcon icon={userTag.icon} strokeWidth={1.75} className={cn(!userTag.color && "text-muted-foreground")} style={userTag.color ? { color: userTag.color } : undefined} />;

  return (
    <>
      <DetailHeader
        media={<DetailMedia icon={<BadgeIcon icon={userTag.icon} strokeWidth={1.75} />} color={userTag.color} />}
        title={userTag.name}
        subtitle={userTag.id}
        marks={userTag.system && <SystemMark />}
      />
      {(rights.edit || deletable) && (
        <DetailActions>
          {rights.edit && <DetailAction label="Modifier" icon={<PencilIcon aria-hidden />} onClick={() => openEdit(userTag)} />}
          {deletable && <DetailAction label="Supprimer" icon={<Trash2Icon aria-hidden />} variant="destructive" onClick={() => openDelete(userTag)} />}
        </DetailActions>
      )}
      {dialogs}
      <DetailSection title="Tag">
        <DetailFields>
          {rights.edit ? (
            <DetailField label="Nom" icon={<TypeIcon />} edit={{ value: userTag.name, onSave: (name) => save({ name: name ?? "" }) }} />
          ) : (
            field("name")
          )}
          {field("id")}
          {rights.edit ? (
            <DetailField
              label="Description"
              icon={<StickyNoteIcon />}
              stacked
              edit={{ value: userTag.description, multiline: true, placeholder: "Affichée dans le détail du tag", onSave: (description) => save({ description }) }}
            />
          ) : (
            <DetailField label="Description" icon={<StickyNoteIcon />} stacked={!!userTag.description}>
              {userTag.description}
            </DetailField>
          )}
          {field("kind")}
          {field("holders")}
          <DetailField label="Position" icon={<ArrowDownUpIcon />}>
            {userTag.position}
          </DetailField>
          {field("createdAt")}
        </DetailFields>
      </DetailSection>
      <DetailSection title="Apparence">
        <DetailFields>
          <DetailField label="Icône" icon={<ShapesIcon />} copy={userTag.icon}>
            <span className="inline-flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-muted [&_svg]:size-3.5">{icon}</span>
              {userTag.icon}
            </span>
          </DetailField>
          <DetailField label="Couleur" icon={<PaletteIcon />} copy={userTag.color}>
            {userTag.color ? (
              <span className="inline-flex items-center gap-2">
                <span className="size-4 rounded-full border" style={{ backgroundColor: userTag.color }} aria-hidden />
                {userTag.color}
              </span>
            ) : (
              "Par défaut"
            )}
          </DetailField>
        </DetailFields>
      </DetailSection>
    </>
  );
}
