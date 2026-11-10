import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@kilotrace/ui/components/layout/page-header";
import { requireAdminMember } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { StationZonesMap } from "./station-zones-map";

/** Prototype of the station zones: what a station may be visited from, on one département. */
export default async function StationZonesPocPage() {
  await requireAdminMember();
  const t = getAdminTranslations("development");
  const z = getAdminTranslations("development.prototypes.stationZones");
  return (
    <>
      <Link href={adminRoutes.development} className="-mb-4 inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        {t("title")}
      </Link>
      <PageHeader title={z("title")} description={z("pageDescription")} />
      <StationZonesMap
        labels={{
          department: z("department"),
          proposal: z("proposal"),
          proposals: { osm: z("proposals.osm"), rails: z("proposals.rails"), both: z("proposals.both") },
          precision: z("precision"),
          precisions: { hull: z("precisions.hull"), plans: z("precisions.plans"), fine: z("precisions.fine") },
          widen: z("widen"),
          asTiles: z("asTiles"),
          footprint: z("footprint"),
          railLinks: z("railLinks"),
          noData: z("noData"),
          tile: z("tile"),
          sources: z("sources"),
          stations: z("stations"),
          zoneArea: z("zoneArea"),
          tileArea: z("tileArea"),
          tileCount: z("tileCount"),
        }}
      />
    </>
  );
}
