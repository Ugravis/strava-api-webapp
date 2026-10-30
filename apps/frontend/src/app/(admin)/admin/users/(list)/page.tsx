import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdminMember } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { ReservedUsernames, ReservedUsernamesSkeleton } from "../reserved-usernames";
import { UsersTable } from "./users-table";

/** The accounts, in the data table; one opens in the panel above. */
export default async function AdminUsersPage() {
  await requireAdminMember();
  const t = getAdminTranslations("users");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<ReservedUsernamesSkeleton />}>
        <ReservedUsernames />
      </Suspense>
      <UsersTable basePath={adminRoutes.users} />
    </>
  );
}
