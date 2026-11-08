"use client";

import { ADMIN_ROLES, type AdminRole, type AdminTeamMember } from "@kilotrace/shared/admin";
import { AtSignIcon, CalendarCheckIcon, ClockIcon, KeyRoundIcon, ListClockIcon, MailIcon, UserRoundIcon } from "lucide-react";
import { type ConfirmOptions, type DataTableColumn, dateColumn, Mark, numberColumn, pillsColumn, textColumn, type Tone, userColumn } from "@kilotrace/ui/components/admin/data-table";
import type { DetailEditOption } from "@kilotrace/ui/components/admin/detail";
import { createVersion } from "@/lib/admin/version";
import { publicNameOf } from "@kilotrace/ui/lib/user";
import { changeRole, removeMember } from "./actions";

/*
 * How a member of the team is drawn and changed, shared by its table and its detail.
 */

/** The version of the team: the `refreshKey` of its table and of its detail. */
export const { useVersion: useTeamVersion, bump: bumpTeam } = createVersion();

export const ROLES: Record<AdminRole, { label: string; tone: Tone }> = {
  support: { label: "Support", tone: "gray" },
  admin: { label: "Admin", tone: "blue" },
  "super-admin": { label: "Super-admin", tone: "violet" },
};

/** The roles, highest first. */
export const ROLE_OPTIONS: DetailEditOption[] = [...ADMIN_ROLES].reverse().map((role) => ({ value: role, ...ROLES[role] }));

export const TEAM_LOCK = "Réservé aux membres qui gèrent l'équipe";
export const SELF_LOCK = "Votre propre rôle ne peut pas être changé";

/** Why the member cannot be changed by the current one, null when they can. */
export const lockOf = (member: AdminTeamMember, meId: string | null, canEdit: boolean) => (!canEdit ? TEAM_LOCK : member.id === meId ? SELF_LOCK : null);

/** The columns of the team, the role edited in place where allowed. */
export function teamColumns(meId: string | null, canEdit: boolean): DataTableColumn<AdminTeamMember>[] {
  return [
    userColumn({
      id: "member",
      header: "Membre",
      icon: <AtSignIcon />,
      sortable: true,
      value: (member) => member,
      marks: (member) => member.id === meId && <Mark label="Vous" tone="sky" icon={<UserRoundIcon />} />,
    }),
    pillsColumn({
      id: "role",
      header: "Rôle",
      icon: <KeyRoundIcon />,
      sortable: true,
      value: (member) => [ROLES[member.role]],
      edit: (member) => ({
        kind: "select",
        value: member.role,
        options: ROLE_OPTIONS,
        required: true,
        locked: lockOf(member, meId, canEdit),
        onSave: async (role) => {
          const result = await changeRole(member.id, role);
          if (result.ok) bumpTeam();
          return result;
        },
      }),
    }),
    dateColumn({ id: "roleSince", header: "Rôle depuis", icon: <CalendarCheckIcon />, sortable: true, value: (member) => member.roleSince }),
    textColumn({ id: "email", header: "E-mail", icon: <MailIcon />, sortable: true, value: (member) => member.email, muted: true, width: "max-w-52" }),
    numberColumn({ id: "logsCount", header: "Logs", icon: <ListClockIcon />, sortable: true, zero: true, value: (member) => member.logsCount }),
    dateColumn({ id: "lastSeenAt", header: "Dernière visite", icon: <ClockIcon />, sortable: true, value: (member) => member.lastSeenAt, relative: true }),
  ];
}

/** The removal of a member, asked first: by its detail or the menu of its row. `done` once removed. */
export function removalOf(member: AdminTeamMember, done: () => void): { confirm: ConfirmOptions; run: () => Promise<unknown> } {
  return {
    confirm: {
      title: `Retirer ${publicNameOf(member)} de l'équipe ?`,
      description: "Le compte perd l'accès au back-office et le tag Équipe. Il en est notifié.",
      confirmLabel: "Retirer",
      destructive: true,
    },
    run: async () => {
      const result = await removeMember(member.id);
      if (result.ok) {
        bumpTeam();
        done();
      }
      return result;
    },
  };
}
