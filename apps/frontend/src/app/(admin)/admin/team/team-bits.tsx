import "server-only";
import { ADMIN_ROLES, type AdminRole, type AdminTeamMember } from "@kilotrace/shared/admin";
import { CrownIcon, KeyRoundIcon, ShieldIcon, UserMinusIcon, UserPlusIcon, UserRoundCogIcon, type LucideIcon } from "lucide-react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { FormDialog, type FormField } from "@/components/admin/form-dialog";
import { UserLink } from "@/components/admin/user-link";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatRelative } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { publicNameOf } from "@/lib/user";
import { cn } from "@/lib/utils";
import { ROLE_COLORS } from "../users/user-bits";
import { addMember, changeRole, removeMember, searchCandidates } from "./actions";

const cell = "px-3 py-2";

const ROLE_ICONS: Record<AdminRole, LucideIcon> = {
  support: ShieldIcon,
  admin: KeyRoundIcon,
  "super-admin": CrownIcon,
};

function roleField(defaultValue: AdminRole): FormField {
  const t = getAdminTranslations("team");
  const roles = getAdminTranslations("roles");
  return {
    kind: "select",
    name: "role",
    label: t("roleField"),
    hint: t("roleHint"),
    defaultValue,
    options: ADMIN_ROLES.map((role) => ({ value: role, label: roles(role) })),
  };
}

/** A role, what it grants and how many members hold it. */
export function RoleSummary({ role, count }: { role: AdminRole; count: number }) {
  const t = getAdminTranslations("team");
  const Icon = ROLE_ICONS[role];
  return (
    <div className="flex items-start gap-3 rounded-xl border p-3">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", ROLE_COLORS[role])}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="flex items-baseline gap-2 text-sm font-medium">
          {getAdminTranslations("roles")(role)}
          <span className="text-xs font-normal text-muted-foreground">{t("count", { count })}</span>
        </p>
        <p className="text-xs text-muted-foreground">{t(`roleHints.${role}`)}</p>
      </div>
    </div>
  );
}

function RolePill({ role }: { role: AdminRole }) {
  const Icon = ROLE_ICONS[role];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", ROLE_COLORS[role])}>
      <Icon className="size-3" aria-hidden />
      {getAdminTranslations("roles")(role)}
    </span>
  );
}

export function AddMemberDialog() {
  const t = getAdminTranslations("team.add");
  return (
    <FormDialog
      action={addMember}
      trigger={{ label: t("trigger"), icon: <UserPlusIcon />, variant: "default" }}
      title={t("title")}
      description={t("description")}
      submitLabel={t("submit")}
      cancelLabel={getAdminTranslations("common")("cancel")}
      fields={[
        { kind: "user", name: "user", label: t("user"), placeholder: t("placeholder"), emptyLabel: t("empty"), search: searchCandidates },
        roleField("support"),
      ]}
    />
  );
}

/** The team, highest role first; the actions never on one's own row. */
export function TeamTable({ members, meId, canEdit }: { members: AdminTeamMember[]; meId: string | null; canEdit: boolean }) {
  const t = getAdminTranslations("team");
  const common = getAdminTranslations("common");
  if (members.length === 0) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>;
  }
  return (
    // Every column stays, the table scrolling sideways on narrow screens.
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="bg-muted text-left text-xs text-muted-foreground">
          <tr>
            <th className={`${cell} font-medium`}>{t("columns.member")}</th>
            <th className={`${cell} font-medium`}>{t("columns.role")}</th>
            <th className={`${cell} font-medium`}>{t("columns.email")}</th>
            <th className={`${cell} font-medium`}>{t("columns.lastSeenAt")}</th>
            {canEdit && <th className={`${cell} text-right font-medium`}>{t("columns.actions")}</th>}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const self = member.id === meId;
            return (
              <tr key={member.id} className="border-t odd:bg-background even:bg-muted/50">
                <td className={cell}>
                  <span className="inline-flex items-center gap-2">
                    <UserLink user={member} fallback={common("none")} deleted={common("none")} />
                    {self && <Badge variant="secondary">{t("you")}</Badge>}
                  </span>
                </td>
                <td className={cell}>
                  <RolePill role={member.role} />
                </td>
                <td className={`${cell} text-muted-foreground`}>{member.email}</td>
                <td className={`${cell} text-muted-foreground`}>
                  {member.lastSeenAt ? (
                    <time dateTime={member.lastSeenAt} title={formatDateTime(member.lastSeenAt)}>
                      {formatRelative(member.lastSeenAt)}
                    </time>
                  ) : (
                    common("never")
                  )}
                </td>
                {canEdit && <td className={cell}>{!self && <MemberActions member={member} />}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MemberActions({ member }: { member: AdminTeamMember }) {
  const t = getAdminTranslations("team");
  const cancelLabel = getAdminTranslations("common")("cancel");
  const name = publicNameOf(member);
  return (
    <div className="flex justify-end gap-1.5">
      <FormDialog
        action={changeRole.bind(null, member.id)}
        trigger={{ label: t("change.trigger"), icon: <UserRoundCogIcon />, iconOnly: true, variant: "ghost" }}
        title={t("change.title", { name })}
        description={t("change.description")}
        submitLabel={t("change.submit")}
        cancelLabel={cancelLabel}
        fields={[roleField(member.role)]}
      />
      <ActionDialog
        action={removeMember.bind(null, member.id)}
        trigger={{ label: t("remove.trigger"), icon: <UserMinusIcon />, iconOnly: true }}
        title={t("remove.title", { name })}
        description={t("remove.description")}
        submitLabel={t("remove.submit")}
        cancelLabel={cancelLabel}
        destructive
      />
    </div>
  );
}
