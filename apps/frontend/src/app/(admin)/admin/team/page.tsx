import {
  ADMIN_PERMISSION_CATEGORIES,
  ADMIN_PERMISSION_KEYS,
  ADMIN_ROLES,
  type AdminPermissionCategory,
  type AdminPermissionsResponse,
  type AdminTeamMember,
  permissionDefinition,
} from "@kilotrace/shared/admin";
import { AtSignIcon, AwardIcon, KeyRoundIcon, LogsIcon, type LucideIcon, UsersIcon, WrenchIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { getAdminMe, requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { savePermissions } from "./actions";
import { type MatrixCategory, PermissionsMatrix } from "./permissions-matrix";
import { AddMemberDialog, RoleSummary, TeamTable } from "./team-bits";

/** Members of the team, their roles, and what each role grants. */
export default async function AdminTeamPage() {
  const { permissions } = await requireAdminMember();
  const canEdit = permissions.includes("team.manage");
  const t = getAdminTranslations("team");
  const [me, result, grants] = await Promise.all([
    getAdminMe(),
    adminApi<AdminTeamMember[]>("/team"),
    adminApi<AdminPermissionsResponse>("/permissions"),
  ]);

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

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("permissions.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("permissions.description")}</p>
        </div>
        {grants.ok ? (
          <PermissionsMatrix
            categories={matrixCategories()}
            initial={grants.data.grants}
            canEdit={permissions.includes("permissions.manage")}
            labels={{
              permission: t("permissions.column"),
              roles: {
                support: getAdminTranslations("roles")("support"),
                admin: getAdminTranslations("roles")("admin"),
                "super-admin": getAdminTranslations("roles")("super-admin"),
              },
              locked: t("permissions.locked"),
              unsaved: t("permissions.unsaved"),
              save: t("permissions.save"),
              reset: t("permissions.reset"),
            }}
            save={savePermissions}
          />
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("permissions.error")}</p>
        )}
      </section>
    </div>
  );
}

/** As in the navigation; the reserved usernames as on their section. */
const CATEGORY_ICONS: Record<AdminPermissionCategory, LucideIcon> = {
  users: UsersIcon,
  usernames: AtSignIcon,
  badges: AwardIcon,
  audit: LogsIcon,
  system: WrenchIcon,
  team: KeyRoundIcon,
};

/** The catalog, labelled here: the client component gets its texts and icons only. */
function matrixCategories(): MatrixCategory[] {
  const categories = getAdminTranslations("team.permissions.categories");
  const labels = getAdminTranslations("team.permissions.list");
  return ADMIN_PERMISSION_CATEGORIES.map((category) => {
    const Icon = CATEGORY_ICONS[category];
    return {
      key: category,
      label: categories(category),
      icon: <Icon aria-hidden />,
      permissions: ADMIN_PERMISSION_KEYS.filter((key) => permissionDefinition(key).category === category).map((key) => ({
        key,
        label: labels(`${key}.label`),
        description: labels(`${key}.description`),
        locked: permissionDefinition(key).locked ?? false,
      })),
    };
  });
}
