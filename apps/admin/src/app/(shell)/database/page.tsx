import { Suspense } from "react";
import { PageHeader } from "@kilotrace/ui/components/layout/page-header";
import { Separator } from "@kilotrace/ui/components/ui/separator";
import { requireAdminMember } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { DatabaseSection, DatabaseSkeleton, UploadsAudit, UploadsSkeleton } from "./database-bits";

/** Audit of the stored files and tables of the database: every member reads, the orphans deleted behind their permission. */
export default async function AdminDatabasePage() {
  const { permissions } = await requireAdminMember();
  const t = getAdminTranslations("database");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("uploads.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("uploads.description")}</p>
        </div>
        <Suspense fallback={<UploadsSkeleton />}>
          <UploadsAudit canEdit={permissions.includes("database.uploads")} />
        </Suspense>
      </section>

      <Separator />
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("tables.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("tables.description")}</p>
        </div>
        <Suspense fallback={<DatabaseSkeleton />}>
          <DatabaseSection />
        </Suspense>
      </section>
    </div>
  );
}
