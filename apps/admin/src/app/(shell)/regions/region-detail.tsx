"use client";

import type { AdminRegion } from "@kilotrace/shared/admin";
import { CopyIcon, LocateFixedIcon, MapIcon, MapPinnedIcon, PanelRightOpenIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DetailAction, DetailActions, DetailColumnFields, DetailHeader, DetailLoader, DetailMedia, DetailSection, DetailSkeleton } from "@kilotrace/ui/components/admin/detail";
import { countryFlag } from "@kilotrace/ui/lib/countries/country-format";
import { datasetMapHref, regionPanelHref } from "@/config/admin-links";
import { regionMapHref } from "@/config/site-links";
import { KINDS, REGION_COLUMNS, regionName } from "./region-bits";

export function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/**
 * The region of the panel, `load` reading it from the list of the page or
 * from the API. `onCenter`: opened from the map of the dataset, which it
 * frames on the region, the regions page a button away.
 */
export function RegionRowPanel({ code, load, onCenter }: { code: string; load: (code: string) => Promise<AdminRegion | null>; onCenter?: () => void }) {
  return (
    <DetailLoader id={code} load={load} skeleton={<DetailSkeleton media actions={3} sections={[3, 9, 6]} />}>
      {(region) => <RegionDetail region={region} onCenter={onCenter} />}
    </DetailLoader>
  );
}

/** Everything about a region, read only: its tiles, its stations and railway, and the members who went there. */
function RegionDetail({ region, onCenter }: { region: AdminRegion; onCenter?: () => void }) {
  const router = useRouter();
  return (
    <>
      <DetailHeader
        media={<DetailMedia icon={<span className="text-2xl leading-none">{countryFlag(region.code)}</span>} />}
        title={regionName(region)}
        subtitle={`${KINDS[region.kind].label} · ${region.code}`}
      />
      <DetailActions>
        {onCenter ? (
          <>
            <DetailAction label="Centrer sur la carte" icon={<LocateFixedIcon aria-hidden />} onClick={onCenter} />
            <DetailAction label="Page Régions" icon={<PanelRightOpenIcon aria-hidden />} onClick={() => router.push(regionPanelHref(region.code))} />
          </>
        ) : (
          <DetailAction label="Carte du dataset" icon={<MapPinnedIcon aria-hidden />} onClick={() => router.push(datasetMapHref(region.code))} />
        )}
        <DetailAction label="Carte du site" icon={<MapIcon aria-hidden />} href={regionMapHref(region.code)} />
        <DetailAction label="Copier le code" icon={<CopyIcon aria-hidden />} onClick={() => copy(region.code, "Code copié")} />
      </DetailActions>
      <DetailSection title="Région">
        <DetailColumnFields row={region} columns={REGION_COLUMNS} ids={["kind", "code", "visitors"]} />
      </DetailSection>
      <DetailSection title="Tuiles">
        <DetailColumnFields row={region} columns={REGION_COLUMNS} ids={["totalTiles", "visitedTiles", "coverage", "totalSubtiles", "visitedSubtiles", "subtilesShare", "totals", "computedAt", "requestedAt"]} />
      </DetailSection>
      <DetailSection title="Réseau">
        <DetailColumnFields row={region} columns={REGION_COLUMNS} ids={["stations", "heldStations", "stationsShare", "railKm", "visitedRailKm", "railShare"]} />
      </DetailSection>
    </>
  );
}
