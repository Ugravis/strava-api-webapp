import type { AdminDevResponse } from "@kilotrace/shared/admin";
import { PageHeader } from "@kilotrace/ui/components/layout/page-header";
import { Separator } from "@kilotrace/ui/components/ui/separator";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { DeploymentCard, MigrationsSection, VersionsCard } from "./dev-bits";

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
          <VersionsCard dependencies={result.data.dependencies} />
        </>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("error")}</p>
      )}

      {result.ok && <Separator />}
      {result.ok && <MigrationsSection applied={result.data.applied} pending={result.data.pending} />}
    </div>
  );
}
