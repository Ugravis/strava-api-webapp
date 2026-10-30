import { PageHeader } from "@/components/layout/page-header";
import { requireAdminMember } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { ReservedTable } from "./reserved-table";

/** Usernames nobody can take: every member reads, the permission adds, edits and deletes. */
export default async function AdminReservedUsernamesPage() {
  const { permissions } = await requireAdminMember();
  const t = getAdminTranslations("reservedUsernames");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <ReservedTable canEdit={permissions.includes("usernames.manage")} />
    </>
  );
}
