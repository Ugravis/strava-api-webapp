import { Suspense } from "react";
import { ListNavigationProvider, ListResults } from "@/components/admin/list-navigation";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdminPermission } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { CommitsSkeleton } from "./commits-bits";

/** Header of the commits, kept across the pages: a skeleton shows while GitHub answers. */
export default async function AdminCommitsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPermission("dev.view");
  const t = getAdminTranslations("commits");
  const skeleton = <CommitsSkeleton />;
  return (
    <ListNavigationProvider>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={skeleton}>
        <ListResults skeletons={{ param: "", byValue: { "": skeleton } }}>{children}</ListResults>
      </Suspense>
    </ListNavigationProvider>
  );
}
