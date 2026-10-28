import { ADMIN_USER_SORTS, ADMIN_USER_STATUSES } from "@kilotrace/shared/admin";
import { LayoutGridIcon, TableIcon } from "lucide-react";
import { Suspense } from "react";
import { ListNavigationProvider, ListResults } from "@/components/admin/list-navigation";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { ReservedUsernames, ReservedUsernamesSkeleton } from "../reserved-usernames";

/**
 * Header and filters of the users, kept across the pages of results: only
 * the list changes, a skeleton showing while the next one loads.
 */
export default function AdminUsersLayout({ children }: { children: React.ReactNode }) {
  const t = getAdminTranslations("users");
  const skeletons = { param: "view", byValue: { "": <CardsSkeleton />, table: <TableSkeleton /> } };
  return (
    <ListNavigationProvider>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<ReservedUsernamesSkeleton />}>
        <ReservedUsernames />
      </Suspense>
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
      {/* The first results, then the next ones, behind the same skeleton. */}
      <Suspense fallback={<ListResultsFallback skeletons={skeletons} />}>
        <ListResults skeletons={skeletons}>{children}</ListResults>
      </Suspense>
    </ListNavigationProvider>
  );
}

/** Before the view is known on the server, the cards. */
function ListResultsFallback({ skeletons }: { skeletons: { byValue: Record<string, React.ReactNode> } }) {
  return skeletons.byValue[""];
}

function CardsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      <Skeleton className="h-4 w-24" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton key={index} className="h-[3.75rem] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      <Skeleton className="h-4 w-24" />
      <div className="overflow-hidden rounded-xl border">
        <Skeleton className="h-9 w-full rounded-none" />
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 border-t px-3 py-2 even:bg-muted/50">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
