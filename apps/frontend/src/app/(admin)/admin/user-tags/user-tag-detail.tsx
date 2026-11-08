"use client";

import { type AdminUserTag, USER_TAG_RULES } from "@kilotrace/shared/admin";
import { ArrowDownUpIcon, CopyPlusIcon, FingerprintIcon, StickyNoteIcon, Trash2Icon, TypeIcon } from "lucide-react";
import { useRouter } from "next/navigation";
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
  DetailRelated,
  DetailSection,
  DetailSkeleton,
  fromRule,
  type RowPanelControls,
} from "@kilotrace/ui/components/admin/detail";
import { BADGE_ICON_KEYS, BadgeIcon } from "@kilotrace/ui/components/distances/badge-icon";
import { UserAvatar } from "@kilotrace/ui/components/user/user-avatar";
import { publicNameOf } from "@kilotrace/ui/lib/user";
import { createUserTag, loadUserTag, loadUserTagHolders, type UserTagDraft } from "./actions";
import { bumpUserTags, deleteLock, deleteOf, LOCKS, saveTag, SystemMark, userTagColumns, type UserTagRights, useUserTagsVersion } from "./user-tag-bits";

const BLANK: UserTagDraft = { id: null, name: null, description: null, icon: BADGE_ICON_KEYS[0], color: null };

/** The user tag loaded by the panel, its skeleton meanwhile; loaded again after every change. */
/** `openUser`: a holder opened in the panel, else on the page of the accounts. */
export function UserTagRowPanel({ id, rights, usersPath, panel, openUser }: { id: string; rights: UserTagRights; usersPath: string; panel: RowPanelControls; openUser?: (user: { id: string; username: string }) => void }) {
  const version = useUserTagsVersion();
  return (
    <DetailLoader id={id} load={loadUserTag} refreshKey={version} skeleton={<DetailSkeleton media actions={2} sections={[7, 2, 3]} />}>
      {(userTag) => <UserTagDetail userTag={userTag} rights={rights} usersPath={usersPath} panel={panel} version={version} openUser={openUser} />}
    </DetailLoader>
  );
}

/** Everything about a user tag, its fields edited in place, and the accounts holding it; those of the code are never deleted. */
function UserTagDetail({
  userTag,
  rights,
  usersPath,
  panel,
  version,
  openUser,
}: {
  userTag: AdminUserTag;
  rights: UserTagRights;
  usersPath: string;
  panel: RowPanelControls;
  version: number;
  openUser?: (user: { id: string; username: string }) => void;
}) {
  const router = useRouter();
  const columns = useMemo(() => userTagColumns(rights.edit), [rights.edit]);
  const removal = deleteOf(userTag, () => panel.removed(userTag.id));
  const { name, description, icon, color } = userTag;

  return (
    <>
      <DetailHeader
        media={<DetailMedia icon={<BadgeIcon icon={userTag.icon} strokeWidth={1.75} />} color={userTag.color} />}
        title={userTag.name}
        subtitle={userTag.id}
        marks={userTag.system && <SystemMark />}
      />
      <DetailActions>
        <DetailAction
          label="Dupliquer"
          icon={<CopyPlusIcon aria-hidden />}
          locked={rights.create ? null : LOCKS.create}
          onClick={() => panel.create({ name, description, icon, color } satisfies Partial<UserTagDraft>)}
        />
        <DetailAction label="Supprimer" icon={<Trash2Icon aria-hidden />} variant="destructive" locked={deleteLock(userTag, rights)} confirm={removal.confirm} onClick={removal.run} />
      </DetailActions>
      <DetailSection title="Tag">
        <DetailFields>
          <DetailField
            label="Nom"
            icon={<TypeIcon />}
            edit={{
              ...fromRule(USER_TAG_RULES.name),
              value: userTag.name,
              locked: rights.edit ? null : LOCKS.edit,
              onSave: (next) => saveTag(userTag, { name: next?.trim() ?? "" }),
            }}
          />
        </DetailFields>
        <DetailColumnFields row={userTag} columns={columns} ids={["id", { id: "description", stacked: true }, "kind", "holders"]} />
        <DetailFields>
          <DetailField label="Position" icon={<ArrowDownUpIcon />}>
            {userTag.position}
          </DetailField>
        </DetailFields>
        <DetailColumnFields row={userTag} columns={columns} ids={["createdAt"]} />
      </DetailSection>
      <DetailSection title="Apparence">
        <DetailColumnFields row={userTag} columns={columns} ids={["icon", "color"]} />
      </DetailSection>
      <DetailSection title="Membres">
        <DetailRelated
          refreshKey={version}
          empty="Aucun compte ne porte ce tag."
          load={(offset) =>
            loadUserTagHolders(userTag.id, offset).then(({ users, total }) => ({
              total,
              items: users.map((user) => ({
                id: user.id,
                media: <UserAvatar user={user} className="size-8" />,
                title: publicNameOf(user),
                subtitle: `@${user.username}`,
                onOpen: () => (openUser ? openUser(user) : router.push(`${usersPath}?row=${user.id}`)),
              })),
            }))
          }
        />
      </DetailSection>
    </>
  );
}

/** A user tag to create, blank or copied: nothing saved before « Créer ». */
export function UserTagCreate({ initial, onCancel, onCreated }: { initial?: Partial<UserTagDraft>; onCancel: () => void; onCreated: (id: string) => void }) {
  const columns = useMemo(() => userTagColumns(true), []);
  return (
    <DetailForm<UserTagDraft>
      initial={{ ...BLANK, ...initial }}
      rules={USER_TAG_RULES}
      onSubmit={async (draft) => {
        const result = await createUserTag(draft);
        if (result.ok) bumpUserTags();
        return result;
      }}
      onCancel={onCancel}
      onCreated={(created) => onCreated(created.id!)}
      submitLabel="Créer le tag"
    >
      {(form) => (
        <>
          <DetailHeader
            media={<DetailMedia icon={<BadgeIcon icon={form.values.icon ?? BADGE_ICON_KEYS[0]} strokeWidth={1.75} />} color={form.values.color} />}
            title={form.values.name?.trim() || "Nouveau tag"}
            subtitle="Ajouté en fin de liste, attribué ensuite depuis la fiche d'un compte."
          />
          <DetailSection title="Tag">
            <DetailFields>
              <DetailField label="Nom" icon={<TypeIcon />} edit={form.bind("name", { kind: "text", placeholder: "Ambassadeur" })} />
              <DetailField label="Identifiant" icon={<FingerprintIcon />} edit={form.bind("id", { kind: "text", placeholder: "Minuscules, chiffres et _ ; définitif" })} />
              <DetailField
                label="Description"
                icon={<StickyNoteIcon />}
                stacked
                edit={form.bind("description", { kind: "text", multiline: true, placeholder: "Affichée dans le détail du tag" })}
              />
            </DetailFields>
          </DetailSection>
          <DetailSection title="Apparence">
            <DetailColumnFields
              columns={columns}
              ids={[
                { id: "icon", edit: form.bind("icon", { kind: "icon" }) },
                { id: "color", edit: form.bind("color", { kind: "color", noneLabel: "Couleur par défaut" }) },
              ]}
            />
          </DetailSection>
        </>
      )}
    </DetailForm>
  );
}
