import type { SystemStatusResponse } from "@kilotrace/shared";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { MaintenanceCard, SignupsCard, UploadsAudit, UploadsSkeleton } from "./system-bits";

/**
 * Switches of the whole site and audit of the stored files, each action
 * behind its own permission.
 */
export default async function AdminSystemPage() {
  const { permissions } = await requireAdminMember();
  const can = (permission: "system.maintenance" | "system.signups" | "system.uploads") => permissions.includes(permission);
  const t = getAdminTranslations("system");
  const result = await adminApi<SystemStatusResponse>("/system");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {!can("system.maintenance") && !can("system.signups") && !can("system.uploads") && <p className="text-sm text-muted-foreground">{t("readOnly")}</p>}

      {result.ok ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <MaintenanceCard maintenance={result.data.maintenance} canEdit={can("system.maintenance")} />
          <SignupsCard enabled={result.data.signupsEnabled} canEdit={can("system.signups")} />
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
          <UploadsAudit canEdit={can("system.uploads")} />
        </Suspense>
      </section>
    </div>
  );
}
