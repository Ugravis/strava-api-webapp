"use client";

import type { AdminTeamMember } from "@kilotrace/shared/admin";
import { ListClockIcon, UserMinusIcon, UserPlusIcon, UserRoundIcon, UsersIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Mark } from "@/components/admin/data-table";
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
import { UserAvatar } from "@/components/user/user-avatar";
import { publicNameOf } from "@/lib/user";
import { addMember, loadTeamMember, type MemberDraft, searchCandidates } from "./actions";
import { bumpTeam, lockOf, removalOf, ROLE_OPTIONS, teamColumns, useTeamVersion } from "./team-columns";

export interface TeamPaths {
  users: string;
  auditLog: string;
}

const BLANK: MemberDraft = { user: null, role: "support" };

/** The member loaded by the panel, its skeleton meanwhile; loaded again after every change. */
export function MemberRowPanel({ id, meId, canEdit, paths, panel }: { id: string; meId: string | null; canEdit: boolean; paths: TeamPaths; panel: RowPanelControls }) {
  const version = useTeamVersion();
  return (
    <DetailLoader id={id} load={loadTeamMember} refreshKey={version} skeleton={<DetailSkeleton media actions={3} sections={[6]} />}>
      {(member) => <MemberDetail member={member} meId={meId} canEdit={canEdit} paths={paths} panel={panel} />}
    </DetailLoader>
  );
}

/** Everything about a member; the role changed in place, `canEdit` and never on oneself. */
function MemberDetail({ member, meId, canEdit, paths, panel }: { member: AdminTeamMember; meId: string | null; canEdit: boolean; paths: TeamPaths; panel: RowPanelControls }) {
  const router = useRouter();
  const columns = useMemo(() => teamColumns(meId, canEdit), [meId, canEdit]);
  const removal = removalOf(member, () => panel.removed(member.id));
  return (
    <>
      <DetailHeader
        media={<UserAvatar user={member} className="size-12" />}
        title={publicNameOf(member)}
        subtitle={`@${member.username}`}
        marks={member.id === meId && <Mark label="Vous" tone="sky" icon={<UserRoundIcon />} />}
      />
      <DetailActions>
        <DetailAction label="Voir le compte" icon={<UsersIcon aria-hidden />} onClick={() => router.push(`${paths.users}?row=${member.id}`)} />
        <DetailAction label="Voir ses logs" icon={<ListClockIcon aria-hidden />} onClick={() => router.push(`${paths.auditLog}?actor=${member.id}`)} />
        <DetailAction
          label="Retirer de l'équipe"
          icon={<UserMinusIcon aria-hidden />}
          variant="destructive"
          locked={lockOf(member, meId, canEdit)}
          confirm={removal.confirm}
          onClick={removal.run}
        />
      </DetailActions>
      <DetailSection title="Membre">
        <DetailColumnFields row={member} columns={columns} ids={["member", "role", "roleSince", "email", "logsCount", "lastSeenAt"]} />
      </DetailSection>
    </>
  );
}

/** An account to add to the team: nothing saved before « Ajouter ». */
export function MemberCreate({ meId, onCancel, onCreated }: { meId: string | null; onCancel: () => void; onCreated: (id: string) => void }) {
  const columns = useMemo(() => teamColumns(meId, true), [meId]);
  return (
    <DetailForm<MemberDraft>
      initial={BLANK}
      onSubmit={async (draft) => {
        const result = await addMember(draft);
        if (result.ok) bumpTeam();
        return result;
      }}
      onCancel={onCancel}
      onCreated={(created) => onCreated(created.id!)}
      submitLabel="Ajouter"
    >
      {(form) => (
        <>
          <DetailHeader
            media={<DetailMedia icon={<UserPlusIcon />} />}
            title={form.values.user?.label ?? "Nouveau membre"}
            subtitle="Le compte reçoit le rôle choisi et le tag Équipe sur son profil, et en est notifié."
          />
          <DetailSection title="Membre">
            <DetailFields>
              <DetailField
                label="Compte"
                icon={<UsersIcon />}
                edit={form.bind("user", { kind: "relation", search: searchCandidates, placeholder: "Pseudo, nom ou e-mail", required: true })}
              />
            </DetailFields>
            <DetailColumnFields columns={columns} ids={[{ id: "role", edit: form.bind("role", { kind: "select", options: ROLE_OPTIONS, required: true }) }]} />
          </DetailSection>
        </>
      )}
    </DetailForm>
  );
}
