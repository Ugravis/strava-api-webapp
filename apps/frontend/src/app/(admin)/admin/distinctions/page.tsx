import type { AdminDistinction } from "@kilotrace/shared/admin";
import { SortableList } from "@/components/admin/sortable-list";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { reorderDistinctions } from "./actions";
import { DistinctionFormDialog, type DistinctionRights, DistinctionRow } from "./distinction-bits";

/**
 * The distinctions, badges owed to the membership, in the order of the
 * profiles: creating, editing (reordering by drag and drop included) and
 * deleting each need their permission; the ones awarded by the code stay.
 */
export default async function AdminDistinctionsPage() {
  const { permissions } = await requireAdminMember();
  const rights: DistinctionRights = {
    create: permissions.includes("distinctions.create"),
    edit: permissions.includes("distinctions.edit"),
    delete: permissions.includes("distinctions.delete"),
  };
  const t = getAdminTranslations("distinctions");
  const result = await adminApi<AdminDistinction[]>("/distinctions");
  const distinctions = result.ok ? result.data : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={t("title")} description={t("description")} />
        {rights.create && <DistinctionFormDialog />}
      </div>

      <section className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{t("count", { count: distinctions.length })}</p>
        {distinctions.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : rights.edit ? (
          <SortableList
            action={reorderDistinctions}
            handleLabel={t("dragHandle")}
            className="flex flex-col gap-1.5"
            items={distinctions.map((distinction) => ({
              id: distinction.id,
              content: <DistinctionRow distinction={distinction} rights={rights} />,
            }))}
          />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {distinctions.map((distinction) => (
              <li key={distinction.id}>
                <DistinctionRow distinction={distinction} rights={rights} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
