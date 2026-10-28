import { ADMIN_ROLES, AdminRole, type AdminTeamMember, hasAdminRole } from "@kilotrace/shared/admin";
import { PageHeader } from "@/components/layout/page-header";
import { getAdminMe, requireAdminRole } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { AddMemberDialog, RoleSummary, TeamTable } from "./team-bits";

/** Members of the team and their roles: support reads, super-admins act. */
export default async function AdminTeamPage() {
  const roles = await requireAdminRole(AdminRole.Support);
  const canEdit = hasAdminRole(roles, AdminRole.SuperAdmin);
  const t = getAdminTranslations("team");
  const [me, result] = await Promise.all([getAdminMe(), adminApi<AdminTeamMember[]>("/team")]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={t("title")} description={t("description")} />
        {canEdit && <AddMemberDialog />}
      </div>
      {!canEdit && <p className="text-sm text-muted-foreground">{t("readOnly")}</p>}

      {result.ok ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[...ADMIN_ROLES].reverse().map((role) => (
              <RoleSummary key={role} role={role} count={result.data.filter((member) => member.role === role).length} />
            ))}
          </div>
          <TeamTable members={result.data} meId={me?.id ?? null} canEdit={canEdit} />
        </>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("error")}</p>
      )}
    </div>
  );
}
