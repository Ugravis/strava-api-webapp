"use client";

import type { AdminRegion, AdminRegionKind } from "@kilotrace/shared/admin";
import { CalendarClockIcon, CalendarSearchIcon, CircleCheckIcon, EarthIcon, FingerprintIcon, Grid2x2Icon, Grid3x3Icon, PercentIcon, RouteIcon, ShapesIcon, TrainFrontIcon, UsersIcon } from "lucide-react";
import { codeColumn, type DataTableColumn, dateColumn, lookColumn, numberColumn, shareColumn, statusColumn } from "@kilotrace/ui/components/admin/data-table";
import { countryFlag, countryName } from "@kilotrace/ui/lib/countries/country-format";

/*
 * How a region is drawn, shared by its table and its detail.
 */

export const KINDS: Record<AdminRegionKind, { label: string; plural: string; tone: "blue" }> = {
  country: { label: "Pays", plural: "Pays", tone: "blue" },
};

/** Where the totals of its tiles stand: computed by the worker, asked for by a sector, or waiting for a visit. */
export const TOTALS = {
  computed: { label: "Calculés", tone: "green" },
  requested: { label: "Demandés", tone: "amber" },
  pending: { label: "En attente", tone: "gray" },
} as const;
export type TotalsState = keyof typeof TOTALS;

export const VISITS = { visited: "Visitée", never: "Jamais visitée" } as const;

export const totalsOf = (region: AdminRegion): TotalsState => (region.computedAt ? "computed" : region.requestedAt ? "requested" : "pending");

/** Its name in French: the name of the country for now. */
export const regionName = (region: { code: string }) => countryName(region.code, "fr");

/** `part` of `whole`, null without a whole (e.g. totals not computed yet). */
const shareOf = (part: number, whole: number | null) => (whole ? part / whole : null);

/** Shares of a region visited by the members together: its large tiles, small tiles, stations and railway. */
export const coverageOf = (region: AdminRegion) => shareOf(region.visitedTiles, region.totalTiles);
export const subtilesShareOf = (region: AdminRegion) => shareOf(region.visitedSubtiles, region.totalSubtiles);
export const stationsShareOf = (region: AdminRegion) => shareOf(region.heldStations, region.stations);
export const railShareOf = (region: AdminRegion) => shareOf(region.visitedRailM, region.railM);

const km = (meters: number) => (meters ? Math.round(meters / 100) / 10 : null);

/**
 * In the order of the compact view, then the others: the table draws its
 * columns in this order. The counts behind a share are not sortable: their
 * names are those of their shares, which sort the same regions better.
 */
export const REGION_COLUMNS: DataTableColumn<AdminRegion>[] = [
  lookColumn({
    id: "name",
    header: "Région",
    icon: <EarthIcon />,
    sortable: true,
    value: (region) => ({ icon: <span className="text-sm leading-none">{countryFlag(region.code)}</span>, name: regionName(region) }),
  }),
  numberColumn({ id: "visitors", header: "Visiteurs", icon: <UsersIcon />, sortable: true, zero: true, value: (region) => region.visitors }),
  numberColumn({ id: "totalTiles", header: "Tuiles", icon: <Grid2x2Icon />, sortable: true, value: (region) => region.totalTiles }),
  shareColumn({ id: "coverage", header: "Tuiles visitées", icon: <PercentIcon />, sortable: true, value: coverageOf }),
  numberColumn({ id: "stations", header: "Gares", icon: <TrainFrontIcon />, sortable: true, zero: true, value: (region) => region.stations }),
  shareColumn({ id: "stationsShare", header: "Gares visitées", icon: <PercentIcon />, sortable: true, value: stationsShareOf }),
  statusColumn({ id: "kind", header: "Type", icon: <ShapesIcon />, value: (region) => region.kind, statuses: KINDS }),
  codeColumn({ id: "code", header: "Code", icon: <FingerprintIcon />, value: (region) => region.code }),
  numberColumn({ id: "visitedTiles", header: "Tuiles visitées", icon: <Grid2x2Icon />, zero: true, value: (region) => region.visitedTiles }),
  numberColumn({ id: "visitedSubtiles", header: "Petites tuiles visitées", icon: <Grid3x3Icon />, zero: true, value: (region) => region.visitedSubtiles }),
  shareColumn({ id: "subtilesShare", header: "Petites tuiles visitées", icon: <PercentIcon />, sortable: true, value: subtilesShareOf }),
  numberColumn({ id: "totalSubtiles", header: "Petites tuiles", icon: <Grid3x3Icon />, sortable: true, value: (region) => region.totalSubtiles }),
  statusColumn({ id: "totals", header: "Totaux", icon: <CircleCheckIcon />, value: totalsOf, statuses: TOTALS }),
  dateColumn({ id: "computedAt", header: "Calculés le", icon: <CalendarClockIcon />, sortable: true, relative: true, value: (region) => region.computedAt }),
  dateColumn({ id: "requestedAt", header: "Demandés le", icon: <CalendarSearchIcon />, relative: true, value: (region) => region.requestedAt }),
  numberColumn({ id: "heldStations", header: "Gares visitées", icon: <TrainFrontIcon />, zero: true, value: (region) => region.heldStations }),
  numberColumn({ id: "railKm", header: "Voies", icon: <RouteIcon />, sortable: true, unit: "km", value: (region) => km(region.railM) }),
  numberColumn({ id: "visitedRailKm", header: "Voies visitées", icon: <RouteIcon />, unit: "km", value: (region) => km(region.visitedRailM) }),
  shareColumn({ id: "railShare", header: "Voies visitées", icon: <PercentIcon />, sortable: true, value: railShareOf }),
];
