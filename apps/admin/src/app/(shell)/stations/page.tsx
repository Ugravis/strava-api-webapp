import type { AdminStationsOverview } from "@kilotrace/shared/admin";
import { CrownIcon, RouteIcon, TrainFrontIcon, UsersIcon } from "lucide-react";
import { KpiGrid, KpiTile, shareOf } from "@/components/admin/kpi-tile";
import { PageHeader } from "@kilotrace/ui/components/layout/page-header";
import { Separator } from "@kilotrace/ui/components/ui/separator";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import type { StationRights } from "./station-bits";
import { StationsTable } from "./stations-table";

const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });
const plural = (count: number, one: string, many: string) => `${number.format(count)} ${count > 1 ? many : one}`;

/**
 * The figures of the stations of the dataset, then all of them, the most
 * visited first: every member reads, `stations.edit` renames and hides.
 */
export default async function AdminStationsPage() {
  const { permissions } = await requireAdminMember();
  const rights: StationRights = { edit: permissions.includes("stations.edit") };
  const t = getAdminTranslations("stations");
  const result = await adminApi<AdminStationsOverview>("/stations/overview");
  const overview = result.ok ? result.data : null;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {overview && (
        <KpiGrid columns={4}>
          <KpiTile
            icon={TrainFrontIcon}
            color="blue"
            label="Gares"
            value={number.format(overview.total)}
            detail={`${plural(overview.countries.length, "pays", "pays")} · ${plural(overview.hidden, "masquée", "masquées")} · ${plural(overview.renamed, "renommée", "renommées")}`}
            segments={[
              { label: "Emprise OSM", value: overview.zoneSources.osm },
              { label: "Voies", value: overview.zoneSources.rails },
              { label: "Point seul", value: overview.zoneSources.point },
            ]}
          />
          <KpiTile
            icon={UsersIcon}
            color="aqua"
            label="Visitées"
            value={number.format(overview.held)}
            detail={`${percent.format(shareOf(overview.held, overview.total))} des gares, par ${plural(overview.collectors, "membre", "membres")}`}
            gauge={shareOf(overview.held, overview.total)}
          />
          <KpiTile
            icon={CrownIcon}
            color="orange"
            label="La plus visitée"
            value={overview.top ? number.format(overview.top.holders) : "—"}
            detail={overview.top ? `${overview.top.holders > 1 ? "membres ont visité" : "membre a visité"} « ${overview.top.name ?? "Sans nom"} »` : "Aucune gare visitée"}
            href={overview.top ? `${adminRoutes.stations}?row=${overview.top.id}` : undefined}
            gauge={overview.top ? shareOf(overview.top.holders, overview.collectors) : 0}
          />
          <KpiTile
            icon={RouteIcon}
            color="yellow"
            label="Réseau"
            value={`${number.format(overview.linksKm)} km`}
            href={adminRoutes.datasetMap}
            detail={`${plural(overview.links, "liaison", "liaisons")} entre gares${overview.lastImportAt ? `, importé le ${new Date(overview.lastImportAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}` : ""}`}
          />
        </KpiGrid>
      )}
      <Separator />
      <StationsTable rights={rights} countries={overview?.countries.map(({ code }) => code) ?? []} />
    </>
  );
}
