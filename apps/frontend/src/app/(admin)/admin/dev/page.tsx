import { ADMIN_COMMITS_COUNT, AdminRole, type AdminDevResponse } from "@kilotrace/shared/admin";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdminRole } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { CommitsList, CommitsSkeleton } from "./commits";
import { DeploymentCard, MigrationsSection, VersionsCard } from "./dev-bits";

/** Technical overview of the running app: versions, commit, migrations and commits of `main`. */
export default async function AdminDevPage() {
  await requireAdminRole(AdminRole.Support);
  const t = getAdminTranslations("dev");
  const result = await adminApi<AdminDevResponse>("/dev");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {result.ok ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <DeploymentCard dev={result.data} />
          <VersionsCard dependencies={result.data.dependencies} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("error")}</p>
      )}

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("commits.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("commits.description", { count: ADMIN_COMMITS_COUNT })}</p>
        </div>
        <Suspense fallback={<CommitsSkeleton />}>
          <CommitsList />
        </Suspense>
      </section>

      {result.ok && <MigrationsSection applied={result.data.applied} pending={result.data.pending} />}
    </div>
  );
}
