import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdminMember } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { CommitsSkeleton } from "./commits-bits";
import { Prototypes } from "./prototypes";

/** The prototypes, then the commits: a skeleton shows while GitHub answers. */
export default async function AdminDevelopmentLayout({ children }: { children: React.ReactNode }) {
  await requireAdminMember();
  const t = getAdminTranslations("development");
  const commits = getAdminTranslations("commits");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Prototypes />
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">{commits("title")}</h2>
          <p className="text-sm text-muted-foreground">{commits("description")}</p>
        </div>
        <Suspense fallback={<CommitsSkeleton />}>{children}</Suspense>
      </section>
    </>
  );
}
