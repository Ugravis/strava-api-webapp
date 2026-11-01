import type { AdminUserTag } from "@kilotrace/shared/admin";
import { CrownIcon, TagIcon, UsersIcon } from "lucide-react";
import { StatTile } from "@/components/admin/statistics/stat-tile";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import type { UserTagRights } from "./user-tag-bits";
import { UserTagsTable } from "./user-tags-table";

const number = new Intl.NumberFormat("fr-FR");

/**
 * The figures of the user tags, badges owed to the membership, then the tags
 * in the order of the profiles: creating, editing (reordering included) and
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
  const system = userTags.filter((userTag) => userTag.system).length;
  const held = userTags.reduce((total, userTag) => total + userTag.holdersCount, 0);
  const top = userTags.reduce<AdminUserTag | null>((best, userTag) => (userTag.holdersCount > (best?.holdersCount ?? 0) ? userTag : best), null);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {result.ok && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatTile
            icon={TagIcon}
            label="Tags"
            value={number.format(userTags.length)}
            detail={`dont ${number.format(system)} ${system > 1 ? "automatiques" : "automatique"}`}
          />
          <StatTile icon={UsersIcon} label="Attributions" value={number.format(held)} detail="Tags portés, tous membres confondus" />
          <StatTile
            icon={CrownIcon}
            label="Le plus porté"
            value={top ? number.format(top.holdersCount) : "—"}
            detail={top ? `${top.holdersCount > 1 ? "membres portent" : "membre porte"} « ${top.name} »` : "Aucun tag attribué"}
          />
        </div>
      )}
      <UserTagsTable rights={rights} />
    </>
  );
}
