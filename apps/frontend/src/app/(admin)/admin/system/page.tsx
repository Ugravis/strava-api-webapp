import type { SystemStatusResponse } from "@kilotrace/shared";
import { AdminRole, hasAdminRole } from "@kilotrace/shared/admin";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdminRole } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { MaintenanceCard, SignupsCard, UploadsAudit, UploadsSkeleton } from "./system-bits";

/**
 * Switches of the whole site and audit of the stored files: support reads,
 * super-admins act.
 */
export default async function AdminSystemPage() {
  const roles = await requireAdminRole(AdminRole.Support);
  const canEdit = hasAdminRole(roles, AdminRole.SuperAdmin);
  const t = getAdminTranslations("system");
  const result = await adminApi<SystemStatusResponse>("/system");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {!canEdit && <p className="text-sm text-muted-foreground">{t("readOnly")}</p>}

      {result.ok ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <MaintenanceCard maintenance={result.data.maintenance} canEdit={canEdit} />
          <SignupsCard enabled={result.data.signupsEnabled} canEdit={canEdit} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("statusError")}</p>
      )}

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("uploads.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("uploads.description")}</p>
        </div>
        <Suspense fallback={<UploadsSkeleton />}>
          <UploadsAudit canEdit={canEdit} />
        </Suspense>
      </section>
    </div>
  );
}
