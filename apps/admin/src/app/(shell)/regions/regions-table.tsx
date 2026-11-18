"use client";

import type { AdminRegion, AdminRegionKind } from "@kilotrace/shared/admin";
import { CopyIcon, MapIcon, MapPinnedIcon, PanelRightOpenIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useRef } from "react";
import { DataTable, type DataTableConfig, localTableSource, RowActions } from "@kilotrace/ui/components/admin/data-table";
import { type RowPanelControls, useRowPanel } from "@kilotrace/ui/components/admin/detail";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@kilotrace/ui/components/ui/dropdown-menu";
import { datasetMapHref } from "@/config/admin-links";
import { regionMapHref } from "@/config/site-links";
import { coverageOf, KINDS, railShareOf, stationsShareOf, subtilesShareOf, REGION_COLUMNS, regionName, TOTALS, totalsOf, VISITS } from "./region-bits";
import { copy, RegionRowPanel } from "./region-detail";

const openTab = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

const REGION_KINDS = Object.keys(KINDS) as AdminRegionKind[];
const TOTALS_STATES = Object.keys(TOTALS) as (keyof typeof TOTALS)[];

/** Read once per visit: a few hundred rows, searched by their French names in the browser. */
const sourceOf = (regions: AdminRegion[]) =>
  localTableSource(regions, {
    search: (region) => `${regionName(region)} ${region.code}`,
    sorts: {
      name: regionName,
      visitors: (region) => region.visitors,
      coverage: coverageOf,
      totalTiles: (region) => region.totalTiles,
      totalSubtiles: (region) => region.totalSubtiles,
      subtilesShare: subtilesShareOf,
      stationsShare: stationsShareOf,
      railShare: railShareOf,
      computedAt: (region) => region.computedAt,
      stations: (region) => region.stations,
      railKm: (region) => region.railM || null,
    },
    facets: {
      kind: { options: REGION_KINDS, values: (region) => [region.kind] },
      visited: { options: Object.keys(VISITS), values: (region) => [region.visitors > 0 ? "visited" : "never"] },
      totals: { options: TOTALS_STATES, values: (region) => [totalsOf(region)] },
    },
    groupings: { kind: (region) => region.kind, totals: totalsOf },
  });

/** Every region of the dataset, grouped by kind, the most visited first; a click opens one in the side panel. */
export function RegionsTable({ regions }: { regions: AdminRegion[] }) {
  const router = useRouter();
  // The panel, read by the menus of the rows: the config stays the same as it changes.
  const panelRef = useRef<RowPanelControls | null>(null);

  const config = useMemo<DataTableConfig<AdminRegion>>(
    () => ({
      id: "regions",
      fetch: sourceOf(regions),
      rowId: (region) => region.code,
      search: "Nom ou code",
      noun: (total) => (total > 1 ? "régions" : "région"),
      empty: { title: "Aucune région", description: "Les pays apparaîtront ici après leur import (pnpm countries:import)." },
      defaultSort: { id: "visitors", desc: true },
      defaultGroupBy: "kind",
      views: [
        { id: "compact", label: "Table compacte", columns: ["name", "visitors", "totalTiles", "coverage", "stations", "stationsShare"] },
        {
          id: "detailed",
          label: "Table détaillée",
          columns: [
            "name",
            "kind",
            "code",
            "visitors",
            "totalTiles",
            "coverage",
            "totalSubtiles",
            "subtilesShare",
            "totals",
            "computedAt",
            "stations",
            "stationsShare",
            "railKm",
            "railShare",
          ],
        },
        { id: "cards", label: "Cartes", layout: "cards", columns: ["name", "visitors", "coverage", "stationsShare"] },
      ],
      columns: REGION_COLUMNS,
      facets: [
        { id: "kind", label: "Type", options: REGION_KINDS.map((kind) => ({ value: kind, label: KINDS[kind].label })) },
        { id: "visited", label: "Visites", options: Object.entries(VISITS).map(([value, label]) => ({ value, label })) },
        { id: "totals", label: "Totaux", options: TOTALS_STATES.map((state) => ({ value: state, label: TOTALS[state].label })) },
      ],
      groupings: [
        { id: "kind", label: "Type", title: (key) => KINDS[key as keyof typeof KINDS]?.plural ?? key },
        { id: "totals", label: "Totaux", title: (key) => TOTALS[key as keyof typeof TOTALS]?.label ?? key },
      ],
      muted: (region) => region.visitors === 0,
      actions: (region) => (
        <RowActions label={`Actions de ${regionName(region)}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => panelRef.current?.open(region.code)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(region.code, "Code copié")}>
              <CopyIcon />
              Copier le code
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push(datasetMapHref(region.code))}>
              <MapPinnedIcon />
              Voir sur la carte du dataset
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openTab(regionMapHref(region.code))}>
              <MapIcon />
              Voir sur la carte du site
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </RowActions>
      ),
    }),
    [regions, router],
  );
  const load = useMemo(() => async (code: string) => regions.find((region) => region.code === code) ?? null, [regions]);
  const panel = useRowPanel<AdminRegion>({
    config,
    title: regionName,
    load,
    detail: (code) => <RegionRowPanel code={code} load={load} />,
  });
  useLayoutEffect(() => {
    panelRef.current = panel;
  });
  return <DataTable {...panel.table} />;
}
