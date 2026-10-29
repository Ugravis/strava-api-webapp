import type { AdminUserTag } from "@kilotrace/shared/admin";
import { SortableList } from "@/components/admin/sortable-list";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { reorderUserTags } from "./actions";
import { UserTagFormDialog, type UserTagRights, UserTagRow } from "./user-tag-bits";

/**
 * The user tags, badges owed to the membership, in the order of the
 * profiles: creating, editing (reordering by drag and drop included) and
 * deleting each need their permission; the ones awarded by the code stay.
 */
export default async function AdminUserTagsPage() {
  const { permissions } = await requireAdminMember();
  const rights: UserTagRights = {
    create: permissions.includes("userTags.create"),
    edit: permissions.includes("userTags.edit"),
    delete: permissions.includes("userTags.delete"),
  };
  const t = getAdminTranslations("userTags");
  const result = await adminApi<AdminUserTag[]>("/user-tags");
  const userTags = result.ok ? result.data : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={t("title")} description={t("description")} />
        {rights.create && <UserTagFormDialog />}
      </div>

      <section className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{t("count", { count: userTags.length })}</p>
        {userTags.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : rights.edit ? (
          <SortableList
            action={reorderUserTags}
            handleLabel={t("dragHandle")}
            className="flex flex-col gap-1.5"
            items={userTags.map((userTag) => ({
              id: userTag.id,
              content: <UserTagRow userTag={userTag} rights={rights} />,
            }))}
          />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {userTags.map((userTag) => (
              <li key={userTag.id}>
                <UserTagRow userTag={userTag} rights={rights} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
