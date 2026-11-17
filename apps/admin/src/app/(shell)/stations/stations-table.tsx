"use client";

import type { AdminStation } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, ExternalLinkIcon, MapIcon, MapPinnedIcon, PanelRightOpenIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableConfig, RowActions, useConfirmDialog } from "@kilotrace/ui/components/admin/data-table";
import { type RowPanelControls, useRowPanel } from "@kilotrace/ui/components/admin/detail";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@kilotrace/ui/components/ui/dropdown-menu";
import { datasetMapHref } from "@/config/admin-links";
import { stationMapHref } from "@/config/site-links";
import { fetchStationsTable, loadStation } from "./actions";
import { CATEGORIES, countryLabel, HELD, nameOf, NAMINGS, osmHref, stationColumns, type StationRights, TRAINS, useStationsVersion, visibilityIcon, visibilityOf, VISIBILITIES, ZONE_SOURCES } from "./station-bits";
import { StationRowPanel } from "./station-detail";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

const openTab = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

const options = <K extends string>(labels: Record<K, string | { label: string }>) =>
  Object.entries<string | { label: string }>(labels).map(([value, label]) => ({ value, label: typeof label === "string" ? label : label.label }));

/** The stations of the dataset, the most visited first; a click opens one in the side panel. `countries`: those holding stations, most first. */
export function StationsTable({ rights: given, countries: listed }: { rights: StationRights; countries: string[] }) {
  // New objects after each refresh of the page: kept while their values are the same.
  const rights = useMemo(() => given, [given.edit]); // eslint-disable-line react-hooks/exhaustive-deps
  const countryKey = listed.join();
  const countries = useMemo(() => (countryKey ? countryKey.split(",") : []), [countryKey]);
  const version = useStationsVersion();
  const { ask, dialog } = useConfirmDialog();
  const router = useRouter();
  // The panel, read by the menus of the rows: the config stays the same as it changes.
  const panelRef = useRef<RowPanelControls | null>(null);

  const config = useMemo<DataTableConfig<AdminStation>>(
    () => ({
      id: "stations",
      fetch: (query: TableQuery) => fetchStationsTable(query),
      rowId: (station) => station.id,
      search: "Nom, nom OSM, identifiant OSM, exploitant ou code UIC",
      noun: (total) => (total > 1 ? "gares" : "gare"),
      empty: { title: "Aucune gare", description: "Les gares apparaîtront ici après le premier import (pnpm stations:import)." },
      defaultSort: { id: "holders", desc: true },
      views: [
        { id: "compact", label: "Table compacte", columns: ["name", "holders", "country", "category", "routes", "operator", "links", "visibility"] },
        {
          id: "detailed",
          label: "Table détaillée",
          columns: ["name", "holders", "country", "category", "tourist", "routes", "operator", "osmNetwork", "links", "linksKm", "zoneSource", "visibility", "zoneTiles", "osmName", "customName", "osm", "uicRef", "wikidata", "coordinates", "id", "updatedAt"],
        },
        { id: "cards", label: "Cartes", layout: "cards", columns: ["name", "country", "category", "operator", "network", "holders"] },
      ],
      columns: stationColumns(rights.edit),
      facets: [
        { id: "held", label: "Visites", options: options(HELD) },
        { id: "category", label: "Type", options: options(CATEGORIES) },
        { id: "tourist", label: "Train", options: options(TRAINS) },
        { id: "zoneSource", label: "Géométrie", options: options(ZONE_SOURCES) },
        { id: "country", label: "Pays", options: countries.map((code) => ({ value: code, label: countryLabel(code) })) },
        { id: "visibility", label: "Site", options: options(VISIBILITIES) },
        { id: "naming", label: "Nom", options: options(NAMINGS) },
      ],
      groupings: [
        { id: "country", label: "Pays", title: (key) => (key ? countryLabel(key) : "Hors pays") },
        { id: "category", label: "Type", title: (key) => CATEGORIES[key as keyof typeof CATEGORIES]?.label ?? key },
        { id: "zoneSource", label: "Géométrie", title: (key) => ZONE_SOURCES[key as keyof typeof ZONE_SOURCES]?.label ?? key },
        { id: "visibility", label: "Site", title: (key) => VISIBILITIES[key as keyof typeof VISIBILITIES]?.label ?? key },
      ],
      muted: (station) => station.hiddenAt !== null,
      actions: (station) => (
        <RowActions label={`Actions de ${nameOf(station)}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => panelRef.current?.open(station.id)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(nameOf(station), "Nom copié")}>
              <CopyIcon />
              Copier le nom
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push(datasetMapHref(station.id))}>
              <MapPinnedIcon />
              Voir sur la carte du dataset
            </DropdownMenuItem>
            {!station.hiddenAt && (
              <DropdownMenuItem onClick={() => openTab(stationMapHref(station.id))}>
                <MapIcon />
                Voir sur la carte du site
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => openTab(osmHref(station))}>
              <ExternalLinkIcon />
              Ouvrir dans OpenStreetMap
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {rights.edit && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => {
                    const change = visibilityOf(station);
                    ask(change.confirm, change.run);
                  }}
                >
                  {visibilityIcon(station)}
                  {visibilityOf(station).label}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </RowActions>
      ),
    }),
    [rights, countries, ask, router],
  );
  const panel = useRowPanel<AdminStation>({
    config,
    title: nameOf,
    load: loadStation,
    detail: (id, controls) => <StationRowPanel id={id} rights={rights} panel={controls} />,
  });
  useLayoutEffect(() => {
    panelRef.current = panel;
  });
  return (
    <>
      <DataTable {...panel.table} refreshKey={version} />
      {dialog}
    </>
  );
}
