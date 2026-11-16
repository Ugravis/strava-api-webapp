"use client";

import type { AdminStation } from "@kilotrace/shared/admin";
import { ExternalLinkIcon, MapIcon, TrainFrontIcon } from "lucide-react";
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
import { stationMapHref } from "@/config/site-links";
import { loadStation, loadStationNeighbors } from "./actions";
import { countryLabel, HiddenMark, LOCK, nameOf, osmHref, RenamedMark, stationColumns, type StationRights, useStationsVersion, visibilityIcon, visibilityOf } from "./station-bits";

/** Neighbors shown at once, the next ones behind « Voir plus ». */
const NEIGHBORS_PAGE = 10;

/** The station loaded by the panel, its skeleton meanwhile; loaded again after every change. */
export function StationRowPanel({ id, rights, panel }: { id: string; rights: StationRights; panel: RowPanelControls }) {
  const version = useStationsVersion();
  return (
    <DetailLoader id={id} load={loadStation} refreshKey={version} skeleton={<DetailSkeleton media actions={3} sections={[7, 4, 3]} />}>
      {(station) => <StationDetail station={station} rights={rights} panel={panel} version={version} />}
    </DetailLoader>
  );
}

/** Everything about a station: its custom name in place, its geometry, and the stations the railway links it to, opened in the panel. */
function StationDetail({ station, rights, panel, version }: { station: AdminStation; rights: StationRights; panel: RowPanelControls; version: number }) {
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
        <DetailAction label="Voir sur la carte" icon={<MapIcon aria-hidden />} href={stationMapHref(station.id)} locked={station.hiddenAt ? "Masquée : absente de la carte" : null} />
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
        <DetailColumnFields row={station} columns={columns} ids={["customName", "osmName", "visibility", "holders", "country", "id", "updatedAt"]} />
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
