import { AdminRole, AUDIT_VISIBILITIES, hasAdminRole } from "@kilotrace/shared/admin";
import { EyeIcon, EyeOffIcon, LayersIcon } from "lucide-react";
import { Suspense } from "react";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdminRole } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { AUDIT_DOMAINS } from "./domains";

const VISIBILITY_ICONS = { all: <LayersIcon />, visible: <EyeIcon />, hidden: <EyeOffIcon /> };

/**
 * Header and filters of the logs, kept across the pages of results: only
 * the table changes, the previous one staying shown while the next loads.
 */
export default async function AdminAuditLogLayout({ children }: { children: React.ReactNode }) {
  const roles = await requireAdminRole(AdminRole.Admin);
  const t = getAdminTranslations("auditLog");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <ListToolbar
        basePath={adminRoutes.auditLog}
        search={{ label: t("search") }}
        selects={[
          {
            param: "action",
            label: t("filters.action"),
            options: AUDIT_DOMAINS.map((value) => ({
              value,
              label: t(`filters.domains.${value === "all" ? value : (value.slice(0, -1) as "users" | "roles" | "audit")}`),
            })),
          },
        ]}
        toggles={
          hasAdminRole(roles, AdminRole.SuperAdmin)
            ? [
                {
                  param: "visibility",
                  label: t("filters.visibility"),
                  options: AUDIT_VISIBILITIES.map((value) => ({
                    value,
                    label: t(`filters.visibilities.${value}`),
                    icon: VISIBILITY_ICONS[value],
                  })),
                },
              ]
            : []
        }
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>{children}</Suspense>
    </>
  );
}
