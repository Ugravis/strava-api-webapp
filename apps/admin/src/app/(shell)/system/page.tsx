import type { SystemStatusResponse } from "@kilotrace/shared";
import { Suspense } from "react";
import { PageHeader } from "@kilotrace/ui/components/layout/page-header";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { SettingsCards } from "./settings-cards";
import { MaintenanceCard } from "./system-bits";

/** The maintenance banner and the settings of the site, each action behind its own permission. */
export default async function AdminSystemPage() {
  const { permissions } = await requireAdminMember();
  const can = (permission: "system.maintenance" | "system.settings") => permissions.includes(permission);
  const t = getAdminTranslations("system");
  const result = await adminApi<SystemStatusResponse>("/system");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {!can("system.maintenance") && !can("system.settings") && <p className="text-sm text-muted-foreground">{t("readOnly")}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {result.ok ? (
          <MaintenanceCard maintenance={result.data.maintenance} canEdit={can("system.maintenance")} />
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("statusError")}</p>
        )}
        <Suspense fallback={<SettingsSkeleton />}>
          <SettingsCards canEdit={can("system.settings")} />
        </Suspense>
      </div>
    </div>
  );
}

/** The three cards of the settings, while they load. */
function SettingsSkeleton() {
  return Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-64 w-full rounded-xl" />);
}
