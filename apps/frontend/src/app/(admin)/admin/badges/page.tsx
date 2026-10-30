import type { AdminBadgeCatalog } from "@kilotrace/shared/admin";
import { HeartIcon, LayersIcon, MedalIcon, UserRoundIcon } from "lucide-react";
import { StatTile } from "@/components/admin/statistics/stat-tile";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import type { BadgeRights } from "./badge-bits";
import { BadgesTable } from "./badges-table";
import { ThemesTable } from "./themes-table";

const number = new Intl.NumberFormat("fr-FR");
const plural = (count: number, one: string, other: string) => `${number.format(count)} ${count > 1 ? other : one}`;

/**
 * The figures of the catalog, then its badges and its collections: creating,
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
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile
            icon={MedalIcon}
            label="Badges"
            value={number.format(badges.length)}
            detail={inactive > 0 ? `dont ${plural(inactive, "désactivé", "désactivés")}` : "Tous actifs"}
          />
          <StatTile
            icon={LayersIcon}
            label="Collections"
            value={number.format(themes.length)}
            detail={loose > 0 ? `${plural(loose, "badge", "badges")} sans collection` : "Chaque badge a sa collection"}
          />
          <StatTile icon={HeartIcon} label="Favoris" value={number.format(sum((badge) => badge.favoritesCount))} detail="Badges mis en favori" />
          <StatTile icon={UserRoundIcon} label="Profils" value={number.format(sum((badge) => badge.profilesCount))} detail="Badges épinglés sur un profil" />
        </div>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Badges</h2>
        <BadgesTable themes={themes} rights={rights} />
      </section>
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-medium">Collections</h2>
          <p className="text-sm text-muted-foreground">Regroupent des badges de tous les sports, en onglets sur la page Succès.</p>
        </div>
        <ThemesTable rights={rights} />
      </section>
    </>
  );
}
