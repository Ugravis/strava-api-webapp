import type { AdminRegionsList } from "@kilotrace/shared/admin";
import { CrownIcon, EarthIcon, RouteIcon, UsersIcon } from "lucide-react";
import { KpiGrid, KpiTile, shareOf } from "@/components/admin/kpi-tile";
import { PageHeader } from "@kilotrace/ui/components/layout/page-header";
import { Separator } from "@kilotrace/ui/components/ui/separator";
import { countryFlag, countryName } from "@kilotrace/ui/lib/countries/country-format";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { RegionsTable } from "./regions-table";

const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });
const plural = (count: number, one: string, many: string) => `${number.format(count)} ${count > 1 ? many : one}`;

/**
 * The figures of the regions of the dataset, then all of them grouped by
 * kind, the most visited first: read only, for every member.
 */
export default async function AdminRegionsPage() {
  await requireAdminMember();
  const t = getAdminTranslations("regions");
  const result = await adminApi<AdminRegionsList>("/regions");
  if (!result.ok) throw new Error(`Admin regions: ${result.status}`);
  const { regions, members } = result.data;
  const visited = regions.filter((region) => region.visitors > 0).length;
  const computed = regions.filter((region) => region.computedAt).length;
  // Sorted by visitors by the API.
  const top = regions[0]?.visitors ? regions[0] : null;
  const stations = regions.reduce((sum, region) => sum + region.stations, 0);
  const railKm = Math.round(regions.reduce((sum, region) => sum + region.railM, 0) / 1000);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <KpiGrid columns={4}>
        <KpiTile
          icon={EarthIcon}
          color="blue"
          label="Régions"
          value={number.format(regions.length)}
          detail={`${plural(regions.length, "pays", "pays")} · totaux calculés pour ${number.format(computed)}`}
          segments={[
            { label: "Totaux calculés", value: computed },
            { label: "En attente", value: regions.length - computed },
          ]}
        />
        <KpiTile
          icon={UsersIcon}
          color="aqua"
          label="Visitées"
          value={number.format(visited)}
          detail={`${percent.format(shareOf(visited, regions.length))} des régions, par au moins un membre`}
          gauge={shareOf(visited, regions.length)}
        />
        <KpiTile
          icon={CrownIcon}
          color="orange"
          label="La plus visitée"
          value={top ? number.format(top.visitors) : "—"}
          detail={top ? `${top.visitors > 1 ? "membres sont passés" : "membre est passé"} en ${countryFlag(top.code)} ${countryName(top.code, "fr")}` : "Aucune région visitée"}
          href={top ? `${adminRoutes.regions}?row=${top.code}` : undefined}
          gauge={top ? shareOf(top.visitors, members) : 0}
        />
        <KpiTile
          icon={RouteIcon}
          color="yellow"
          label="Réseau"
          value={`${number.format(railKm)} km`}
          href={adminRoutes.stations}
          detail={`de voies, ${plural(stations, "gare", "gares")} dans les régions`}
        />
      </KpiGrid>
      <Separator />
      <RegionsTable regions={regions} />
    </>
  );
}
