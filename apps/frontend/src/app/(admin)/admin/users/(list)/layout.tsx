import { ADMIN_USER_SORTS, ADMIN_USER_STATUSES } from "@kilotrace/shared/admin";
import { LayoutGridIcon, TableIcon } from "lucide-react";
import { Suspense } from "react";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";

/**
 * Header and filters of the users, kept across the pages of results: only
 * the list changes, the previous one staying shown while the next loads.
 */
export default function AdminUsersLayout({ children }: { children: React.ReactNode }) {
  const t = getAdminTranslations("users");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <ListToolbar
        basePath={adminRoutes.users}
        search={{ label: t("search") }}
        toggles={[
          {
            param: "status",
            label: t("status.label"),
            options: ADMIN_USER_STATUSES.map((value) => ({ value, label: t(`status.${value}`) })),
          },
          {
            param: "view",
            label: t("view.label"),
            options: [
              { value: "cards", label: t("view.cards"), icon: <LayoutGridIcon /> },
              { value: "table", label: t("view.table"), icon: <TableIcon /> },
            ],
          },
        ]}
        selects={[
          {
            param: "sort",
            label: t("sort.label"),
            options: ADMIN_USER_SORTS.map((value) => ({ value, label: t(`sort.${value}`) })),
          },
        ]}
      />
      <Suspense fallback={<UserListSkeleton />}>{children}</Suspense>
    </>
  );
}

function UserListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      <Skeleton className="h-4 w-24" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
