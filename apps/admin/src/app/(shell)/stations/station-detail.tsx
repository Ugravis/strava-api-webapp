"use client";

import type { AdminStation } from "@kilotrace/shared/admin";
import { ExternalLinkIcon, LocateFixedIcon, MapIcon, MapPinnedIcon, PanelRightOpenIcon, TrainFrontIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { formatNumber } from "@kilotrace/ui/components/admin/data-table";
import {
  DetailAction,
  DetailActions,
  DetailColumnFields,
  DetailHeader,
  DetailLoader,
  DetailMedia,
  DetailRelated,
  DetailSection,
  DetailSkeleton,
  type RowPanelControls,
} from "@kilotrace/ui/components/admin/detail";
import { datasetMapHref, stationPanelHref } from "@/config/admin-links";
import { stationMapHref } from "@/config/site-links";
import { loadStation, loadStationNeighbors } from "./actions";
import { countryLabel, HiddenMark, LOCK, nameOf, osmHref, RenamedMark, stationColumns, type StationRights, useStationsVersion, visibilityIcon, visibilityOf } from "./station-bits";

/** Neighbors shown at once, the next ones behind « Voir plus ». */
const NEIGHBORS_PAGE = 10;

/** Opens another station in the panel: a neighbor. */
type StationPanel = Pick<RowPanelControls, "open">;

/**
 * The station loaded by the panel, its skeleton meanwhile; loaded again after
 * every change. `onCenter`: opened from the map of the dataset, which it
 * centers on the station, the stations page a button away.
 */
export function StationRowPanel({ id, rights, panel, onCenter }: { id: string; rights: StationRights; panel: StationPanel; onCenter?: () => void }) {
  const version = useStationsVersion();
  return (
    <DetailLoader id={id} load={loadStation} refreshKey={version} skeleton={<DetailSkeleton media actions={3} sections={[9, 5, 4, 3]} />}>
      {(station) => <StationDetail station={station} rights={rights} panel={panel} version={version} onCenter={onCenter} />}
    </DetailLoader>
  );
}

/** Everything about a station: its custom name in place, its geometry, and the stations the railway links it to, opened in the panel. */
function StationDetail({ station, rights, panel, version, onCenter }: { station: AdminStation; rights: StationRights; panel: StationPanel; version: number; onCenter?: () => void }) {
  const router = useRouter();
  const columns = useMemo(() => stationColumns(rights.edit), [rights.edit]);
  const visibility = visibilityOf(station);

  return (
    <>
      <DetailHeader
        media={<DetailMedia icon={<TrainFrontIcon />} />}
        title={nameOf(station)}
        subtitle={station.countryCode ? countryLabel(station.countryCode) : "Hors pays"}
        marks={
          <>
            {station.customName && <RenamedMark station={station} />}
            {station.hiddenAt && <HiddenMark />}
          </>
        }
      />
      <DetailActions>
        {onCenter ? (
          <>
            <DetailAction label="Centrer sur la carte" icon={<LocateFixedIcon aria-hidden />} onClick={onCenter} />
            <DetailAction label="Page Gares" icon={<PanelRightOpenIcon aria-hidden />} onClick={() => router.push(stationPanelHref(station.id))} />
          </>
        ) : (
          <DetailAction label="Carte du dataset" icon={<MapPinnedIcon aria-hidden />} onClick={() => router.push(datasetMapHref(station.id))} />
        )}
        <DetailAction label="Carte du site" icon={<MapIcon aria-hidden />} href={stationMapHref(station.id)} locked={station.hiddenAt ? "Masquée : absente de la carte" : null} />
        <DetailAction label="OpenStreetMap" icon={<ExternalLinkIcon aria-hidden />} href={osmHref(station)} />
        <DetailAction
          label={visibility.label}
          icon={visibilityIcon(station)}
          variant={station.hiddenAt ? "outline" : "destructive"}
          locked={rights.edit ? null : LOCK}
          confirm={visibility.confirm}
          onClick={visibility.run}
        />
      </DetailActions>
      <DetailSection title="Gare">
        <DetailColumnFields row={station} columns={columns} ids={["customName", "osmName", "visibility", "holders", "country", "uicRef", "wikidata", "id", "updatedAt"]} />
      </DetailSection>
      <DetailSection title="Exploitation">
        <DetailColumnFields row={station} columns={columns} ids={["category", "tourist", "routes", "operator", "osmNetwork"]} />
      </DetailSection>
      <DetailSection title="Géométrie">
        <DetailColumnFields row={station} columns={columns} ids={["zoneSource", "zoneTiles", "coordinates", "osm"]} />
      </DetailSection>
      <DetailSection title="Réseau">
        <DetailColumnFields row={station} columns={columns} ids={["links", "linksKm"]} />
        <DetailRelated
          refreshKey={`${station.id}-${version}`}
          empty="Aucune gare reliée par la voie."
          load={(offset) =>
            loadStationNeighbors(station.id).then((neighbors) => ({
              total: neighbors.length,
              items: neighbors.slice(offset, offset + NEIGHBORS_PAGE).map((neighbor) => ({
                id: neighbor.id,
                title: nameOf(neighbor),
                subtitle: [neighbor.countryCode && countryLabel(neighbor.countryCode), neighbor.hidden && "Masquée"].filter(Boolean).join(" · ") || undefined,
                aside: `${formatNumber(Math.round(neighbor.lengthM / 100) / 10)} km · ${formatNumber(neighbor.holders)} ${neighbor.holders > 1 ? "possesseurs" : "possesseur"}`,
                onOpen: () => panel.open(neighbor.id),
              })),
            }))
          }
        />
      </DetailSection>
    </>
  );
}
