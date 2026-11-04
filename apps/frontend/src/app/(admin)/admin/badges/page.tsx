import type { AdminBadgeCatalog } from "@kilotrace/shared/admin";
import { HeartIcon, LayersIcon, MedalIcon, UserRoundIcon } from "lucide-react";
import { KpiGrid, KpiTile } from "@/components/admin/kpi-tile";
import { PageHeader } from "@/components/layout/page-header";
import { Separator } from "@/components/ui/separator";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import type { BadgeRights } from "./badge-bits";
import { Catalog } from "./catalog";

const number = new Intl.NumberFormat("fr-FR");
const plural = (count: number, one: string, other: string) => `${number.format(count)} ${count > 1 ? other : one}`;

/**
 * The figures of the catalog, then its collections and its badges: creating,
 * editing (toggling and reordering included) and deleting each need their permission.
 */
export default async function AdminBadgesPage() {
  const { permissions } = await requireAdminMember();
  const rights: BadgeRights = {
    create: permissions.includes("badges.create"),
    edit: permissions.includes("badges.edit"),
    delete: permissions.includes("badges.delete"),
  };
  const t = getAdminTranslations("badges");
  const result = await adminApi<AdminBadgeCatalog>("/badges");
  const { themes, badges } = result.ok ? result.data : { themes: [], badges: [] };
  const inactive = badges.filter((badge) => !badge.active).length;
  const loose = badges.filter((badge) => !badge.themeId).length;
  const sum = (count: (badge: (typeof badges)[number]) => number) => badges.reduce((total, badge) => total + count(badge), 0);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {result.ok && (
        <KpiGrid>
          <KpiTile
            icon={MedalIcon}
            color="blue"
            label="Badges"
            value={number.format(badges.length)}
            detail={inactive > 0 ? `dont ${plural(inactive, "désactivé", "désactivés")}` : "Tous actifs"}
          />
          <KpiTile
            icon={LayersIcon}
            color="aqua"
            label="Collections"
            value={number.format(themes.length)}
            detail={loose > 0 ? `${plural(loose, "badge", "badges")} sans collection` : "Chaque badge a sa collection"}
          />
          <KpiTile icon={HeartIcon} color="orange" label="Favoris" value={number.format(sum((badge) => badge.favoritesCount))} detail="Badges mis en favori" />
          <KpiTile icon={UserRoundIcon} color="yellow" label="Profils" value={number.format(sum((badge) => badge.profilesCount))} detail="Badges épinglés sur un profil" />
        </KpiGrid>
      )}
      <Separator />
      <Catalog themes={themes} rights={rights} />
    </>
  );
}
