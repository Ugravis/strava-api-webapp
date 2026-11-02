import type { AdminDevResponse } from "@kilotrace/shared/admin";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { DeploymentCard, MigrationsSection, VersionsSection } from "./dev-bits";

/** Technical overview of the running app: versions, commit and migrations. */
export default async function AdminDevPage() {
  await requireAdminMember();
  const t = getAdminTranslations("dev");
  const result = await adminApi<AdminDevResponse>("/dev");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {result.ok ? (
        <>
          <DeploymentCard dev={result.data} />
          <VersionsSection dependencies={result.data.dependencies} />
        </>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("error")}</p>
      )}

      {result.ok && <MigrationsSection applied={result.data.applied} pending={result.data.pending} />}
    </div>
  );
}
