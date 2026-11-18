"use client";

import { ADMIN_REASON_MAX_LENGTH, ADMIN_REASON_MIN_LENGTH, type AdminStation, type AdminStationCategory, type AdminStationZoneSource, STATION_RULES } from "@kilotrace/shared/admin";
import {
  BadgeCheckIcon,
  BookOpenIcon,
  BuildingIcon,
  CalendarClockIcon,
  CameraIcon,
  EarthIcon,
  EyeIcon,
  EyeOffIcon,
  FingerprintIcon,
  Grid2x2Icon,
  MapPinIcon,
  MapPinnedIcon,
  NetworkIcon,
  PencilLineIcon,
  RouteIcon,
  ShapesIcon,
  SignpostIcon,
  TrainFrontIcon,
  TrainTrackIcon,
  TypeIcon,
  UsersIcon,
  WaypointsIcon,
} from "lucide-react";
import { booleanColumn, codeColumn, formatNumber, type ConfirmOptions, type DataTableColumn, dateColumn, lookColumn, Mark, numberColumn, statusColumn, textColumn } from "@kilotrace/ui/components/admin/data-table";
import { fromRule } from "@kilotrace/ui/components/admin/detail";
import { countryFlag, countryName } from "@kilotrace/ui/lib/countries/country-format";
import { createVersion } from "@/lib/admin/version";
import { hideStation, renameStation } from "./actions";

/*
 * How a station is drawn and changed, shared by its table and its detail.
 */

/** The version of the stations: the `refreshKey` of their table and of their detail. */
export const { useVersion: useStationsVersion, bump: bumpStations } = createVersion();

/** What the permissions of the current member allow on the stations. */
export interface StationRights {
  edit: boolean;
}

export const LOCK = "Réservé aux membres qui modifient les gares";

export const ZONE_SOURCES: Record<AdminStationZoneSource, { label: string; tone: "green" | "blue" | "amber" }> = {
  osm: { label: "Emprise OSM", tone: "green" },
  rails: { label: "Voies", tone: "blue" },
  point: { label: "Point seul", tone: "amber" },
};

export const VISIBILITIES = {
  shown: { label: "Affichée", tone: "green" },
  hidden: { label: "Masquée", tone: "gray" },
} as const;

export const CATEGORIES: Record<AdminStationCategory, { label: string; tone: "green" | "blue" }> = {
  station: { label: "Gare", tone: "green" },
  halt: { label: "Halte", tone: "blue" },
};

export const TRAINS = { tourist: "Touristique", regular: "Classique" } as const;

export const HELD = { held: "Visitée", never: "Jamais visitée" } as const;

/** Name of a country in French, its flag first. */
export const countryLabel = (code: string) => `${countryFlag(code)} ${countryName(code, "fr")}`;

/** The flag of its country, else a train. */
export const stationIcon = (station: { countryCode: string | null }) =>
  station.countryCode ? <span className="text-sm leading-none">{countryFlag(station.countryCode)}</span> : <TrainFrontIcon />;

/** A station without a name in OpenStreetMap. */
export const nameOf = (station: { name: string | null }) => station.name ?? "Sans nom";

/** The page of its item in Wikidata. */
const wikidataHref = (station: AdminStation) => (station.wikidata ? `https://www.wikidata.org/wiki/${station.wikidata}` : null);

/** The page of the object in OpenStreetMap. */
export function osmHref(station: AdminStation): string {
  const kind = { n: "node", w: "way", r: "relation" }[station.osmType] ?? "node";
  return `https://www.openstreetmap.org/${kind}/${station.osmId}`;
}

export const RenamedMark = ({ station }: { station: AdminStation }) => <Mark label={`Renommée, « ${station.osmName ?? "sans nom"} » dans OpenStreetMap`} tone="blue" icon={<PencilLineIcon />} />;
export const HiddenMark = () => <Mark label="Masquée du site" tone="gray" icon={<EyeOffIcon />} />;

/** Saves the name given to a station, empty for the one of OpenStreetMap again; the table and the detail fetch again. */
export async function saveName(station: AdminStation, name: string | null) {
  const result = await renameStation(station.id, name?.trim() || null);
  if (result.ok) bumpStations();
  return result;
}

/** Hiding a station from the site, asked first with a reason, or showing it again: by its detail or the menu of its row. */
export function visibilityOf(station: AdminStation): { label: string; confirm: ConfirmOptions; run: (reason: string | undefined) => Promise<unknown> } {
  const hidden = station.hiddenAt !== null;
  const run = async (reason: string | undefined) => {
    const result = await hideStation(station.id, !hidden, reason);
    if (result.ok) bumpStations();
    return result;
  };
  return hidden
    ? {
        label: "Afficher",
        confirm: {
          title: `Afficher ${nameOf(station)} ?`,
          description: "Elle revient sur la carte, dans les visites et les chiffres des membres qui l'ont visitée.",
          confirmLabel: "Afficher",
        },
        run,
      }
    : {
        label: "Masquer",
        confirm: {
          title: `Masquer ${nameOf(station)} ?`,
          description: "Elle disparaît de la carte, des visites et des chiffres de tous les membres, et le reste au fil des imports. Réversible.",
          confirmLabel: "Masquer",
          destructive: true,
          reason: {
            label: "Raison",
            placeholder: "Expliquez la décision, elle est consignée dans le journal.",
            required: true,
            minLength: ADMIN_REASON_MIN_LENGTH,
            maxLength: ADMIN_REASON_MAX_LENGTH,
            presets: ["Gare fermée", "Doublon", "Pas une gare de voyageurs"],
          },
        },
        run,
      };
}

export const visibilityIcon = (station: AdminStation) => (station.hiddenAt ? <EyeIcon aria-hidden /> : <EyeOffIcon aria-hidden />);

/** The columns, in the order of the views; `edit` gives a custom name to a station in place, in the table and in the detail. */
export const stationColumns = (edit: boolean): DataTableColumn<AdminStation>[] => [
  lookColumn({
    id: "name",
    header: "Gare",
    icon: <TrainFrontIcon />,
    sortable: true,
    value: (station) => ({ icon: stationIcon(station), name: nameOf(station) }),
    marks: (station) => (
      <>
        {station.customName && <RenamedMark station={station} />}
        {station.hiddenAt && <HiddenMark />}
      </>
    ),
  }),
  numberColumn({ id: "holders", header: "Possesseurs", icon: <UsersIcon />, sortable: true, zero: true, value: (station) => station.holders }),
  textColumn({ id: "country", header: "Pays", icon: <EarthIcon />, sortable: true, value: (station) => station.countryCode && countryLabel(station.countryCode) }),
  textColumn({
    id: "network",
    header: "Réseau",
    icon: <TrainTrackIcon />,
    value: (station) => `${formatNumber(station.links)} · ${formatNumber(Math.round(station.linksM / 100) / 10)} km`,
  }),
  numberColumn({ id: "links", header: "Liaisons", icon: <TrainTrackIcon />, sortable: true, value: (station) => station.links }),
  numberColumn({ id: "linksKm", header: "Voies reliées", icon: <RouteIcon />, unit: "km", sortable: true, value: (station) => (station.linksM ? Math.round(station.linksM / 100) / 10 : null) }),
  statusColumn({ id: "category", header: "Type", icon: <SignpostIcon />, value: (station) => station.category, statuses: CATEGORIES }),
  booleanColumn({ id: "tourist", header: "Touristique", icon: <CameraIcon />, value: (station) => station.tourist }),
  numberColumn({ id: "routes", header: "Lignes", icon: <WaypointsIcon />, sortable: true, value: (station) => station.routes }),
  textColumn({ id: "operator", header: "Exploitant", icon: <BuildingIcon />, sortable: true, value: (station) => station.operator }),
  textColumn({ id: "osmNetwork", header: "Réseau commercial", icon: <NetworkIcon />, value: (station) => station.network }),
  statusColumn({ id: "zoneSource", header: "Géométrie", icon: <ShapesIcon />, value: (station) => station.zoneSource, statuses: ZONE_SOURCES }),
  statusColumn({ id: "visibility", header: "Site", icon: <EyeIcon />, value: (station) => (station.hiddenAt ? "hidden" : "shown"), statuses: VISIBILITIES }),
  numberColumn({ id: "zoneTiles", header: "Tuiles de géométrie", icon: <Grid2x2Icon />, value: (station) => station.zoneTiles }),
  textColumn({ id: "osmName", header: "Nom OSM", icon: <TypeIcon />, muted: true, value: (station) => station.osmName }),
  textColumn({
    id: "customName",
    header: "Nom custom",
    icon: <PencilLineIcon />,
    value: (station) => station.customName,
    edit: (station) => ({
      kind: "text",
      ...fromRule(STATION_RULES.name),
      value: station.customName,
      placeholder: station.osmName ?? "Nom affiché sur le site",
      locked: edit ? null : LOCK,
      onSave: (name) => saveName(station, name),
    }),
  }),
  codeColumn({ id: "osm", header: "OpenStreetMap", icon: <MapPinnedIcon />, value: (station) => `${station.osmType}${station.osmId}`, href: osmHref }),
  codeColumn({ id: "uicRef", header: "Code UIC", icon: <BadgeCheckIcon />, value: (station) => station.uicRef }),
  codeColumn({ id: "wikidata", header: "Wikidata", icon: <BookOpenIcon />, value: (station) => station.wikidata, href: wikidataHref }),
  codeColumn({ id: "coordinates", header: "Coordonnées", icon: <MapPinIcon />, value: (station) => `${station.lat.toFixed(5)}, ${station.lon.toFixed(5)}` }),
  codeColumn({ id: "id", header: "Identifiant", icon: <FingerprintIcon />, value: (station) => station.id }),
  dateColumn({ id: "updatedAt", header: "Mise à jour", icon: <CalendarClockIcon />, sortable: true, relative: true, value: (station) => station.updatedAt }),
];
