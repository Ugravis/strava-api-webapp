"use client";

import { CalendarClockIcon, CalendarIcon, CalendarPlusIcon, GaugeIcon, ImageIcon, LayersIcon, MedalIcon, PaletteIcon, ShapesIcon, ToggleRightIcon, UsersIcon } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import {
  type CellImage,
  DataTable,
  type DataTableConfig,
  dateColumn,
  editColumn,
  imageColumn,
  localTableSource,
  numberColumn,
  orderColumn,
  pillsColumn,
  type TableMove,
  textColumn,
  type Tone,
} from "@/components/admin/data-table";
import { useSplitPanel } from "@/components/split-panel";
import { landscape } from "./poc-data";
import { PocBadgeCreate, type PocBadgeDraft } from "./poc-badge-create";
import { PocBadgePanel } from "./poc-badge-detail";
import { savePocBadge, usePocVersion } from "./poc-store";

/*
 * Fake badges kept in one order of the database, whatever their collection:
 * the showcase of the rows moved by drag and drop.
 */

export type PocCollection = "distance" | "tiles" | "stations";

export interface PocBadge {
  id: string;
  name: string;
  collection: PocCollection;
  /** From 1. */
  position: number;
  holders: number;
  createdAt: string;
  /** None on some, to show the empty cover. */
  picture: CellImage | null;
  /** Of its icon, `#rrggbb`; none on some. */
  color: string | null;
  /** A Lucide icon, e.g. `medal`. */
  icon: string;
  /** In the unit of its collection. */
  threshold: number;
  /** Still won. */
  active: boolean;
  /** A day `YYYY-MM-DD`, before which it is not won. */
  availableFrom: string | null;
  /** An instant after which it is no longer won. */
  endsAt: string | null;
  /** Shown to the athletes, on several lines. */
  description: string | null;
  /** The sports counted, of `SPORTS`: a distance only, at least one. */
  sports: string[];
}

/** The sports a badge of distance counts. */
export const SPORTS = [
  { value: "run", label: "Course" },
  { value: "ride", label: "Vélo" },
  { value: "walk", label: "Marche" },
  { value: "hike", label: "Randonnée" },
  { value: "ski", label: "Ski" },
  { value: "swim", label: "Natation" },
];

export const COLLECTIONS: Record<PocCollection, { label: string; tone: Tone; unit: string; icon: string }> = {
  distance: { label: "Distance", tone: "blue", unit: "km", icon: "route" },
  tiles: { label: "Tuiles", tone: "fuchsia", unit: "tuiles", icon: "grid-3x3" },
  stations: { label: "Gares", tone: "amber", unit: "gares", icon: "train-front" },
};

/** The collections as the options of a list. */
export const COLLECTION_OPTIONS = Object.entries(COLLECTIONS).map(([value, { label, tone }]) => ({ value, label, tone }));

const COLORS = ["#2563eb", "#c026d3", "#d97706", null, "#16a34a"];

const NAMES: Record<PocCollection, string[]> = {
  distance: ["Premier kilomètre", "Semi-marathon", "Marathon", "Tour de France", "Équateur"],
  tiles: ["Première tuile", "Carré 5×5", "Carré 10×10", "Grand carré"],
  stations: ["Première gare", "Dix gares", "Cent gares", "Toutes les gares d'une ligne", "Gare frontalière"],
};

/** Changed by the moves, like a database would be. */
export const BADGES: PocBadge[] = (Object.keys(NAMES) as PocCollection[]).flatMap((collection, at) =>
  NAMES[collection].map((name, index) => ({
    id: `${collection}-${index + 1}`,
    name,
    collection,
    position: 0,
    holders: Math.round(1200 / (index + 1) ** 1.6) + at * 7,
    createdAt: new Date(Date.UTC(2026, 3 + at, 2 + index * 9)).toISOString(),
    picture: index === 3 ? null : { src: landscape(at * 120 + index * 25, index * 20), alt: `Image du badge ${name}` },
    color: COLORS[(at + index) % COLORS.length]!,
    icon: COLLECTIONS[collection].icon,
    threshold: 10 ** (index + 1) / (collection === "tiles" ? 10 : 1),
    active: index !== 2,
    availableFrom: index % 2 === 0 ? `2026-0${4 + at}-01` : null,
    endsAt: index === 4 ? new Date(Date.UTC(2027, 0, 1, 23)).toISOString() : null,
    description: index === 0 ? `Le premier badge de la collection ${COLLECTIONS[collection].label.toLowerCase()}.` : null,
    sports: collection === "distance" ? ["run", "ride", "walk"].slice(0, 1 + (index % 3)) : [],
  })),
);
BADGES.forEach((badge, index) => (badge.position = index + 1));

/** Places the badge before or after its new neighbour, then numbers them all again. */
async function moveBadge({ id, after, before }: TableMove) {
  const badge = BADGES.find((each) => each.id === id)!;
  const others = BADGES.filter((each) => each !== badge).sort((a, b) => a.position - b.position);
  const at = before ? others.findIndex((each) => each.id === before) : others.findIndex((each) => each.id === after) + 1;
  others.splice(at, 0, badge);
  others.forEach((each, index) => (each.position = index + 1));
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { ok: true, message: "Ordre enregistré" };
}

export const BADGES_TABLE: DataTableConfig<PocBadge> = {
  id: "badges",
  fetch: localTableSource(BADGES, {
    search: (badge) => badge.name,
    sorts: {
      position: (badge) => badge.position,
      name: (badge) => badge.name,
      holders: (badge) => badge.holders,
      createdAt: (badge) => badge.createdAt,
    },
    groupings: { collection: (badge) => badge.collection },
    delay: () => 200 + Math.random() * 300,
  }),
  rowId: (badge) => badge.id,
  reorder: moveBadge,
  search: "Nom du badge",
  noun: (count) => (count > 1 ? "badges" : "badge"),
  empty: { title: "Aucun badge", description: "Les badges apparaîtront ici dès leur création." },
  defaultSort: { id: "position", desc: false },
  maxHeight: "none",
  views: [
    { id: "table", label: "Tableau" },
    { id: "cards", label: "Cartes", layout: "cards" },
    { id: "list", label: "Liste", layout: "list", columns: ["position", "name", "collection"] },
  ],
  columns: [
    orderColumn({ id: "position", header: "Ordre", value: (badge) => badge.position }),
    textColumn({
      id: "name",
      header: "Badge",
      icon: <MedalIcon />,
      sortable: true,
      locked: true,
      value: (badge) => badge.name,
      width: "max-w-56",
      edit: (badge) => ({ kind: "text", value: badge.name, onSave: (name) => savePocBadge(badge.id, { name }) }),
    }),
    imageColumn({ id: "picture", header: "Image", icon: <ImageIcon />, value: (badge) => badge.picture }),
    pillsColumn({
      id: "collection",
      header: "Collection",
      icon: <LayersIcon />,
      value: (badge) => [COLLECTIONS[badge.collection]],
      // Picked in a list, in the cell as in the detail.
      edit: (badge) => ({
        kind: "select",
        value: badge.collection,
        options: COLLECTION_OPTIONS,
        onSave: (collection) => savePocBadge(badge.id, { collection: collection as PocBadge["collection"] | null }),
      }),
    }),
    // Every other kind of edit, in its cell: the same as in the detail.
    editColumn({ id: "color", header: "Couleur", icon: <PaletteIcon />, edit: (badge) => ({ kind: "color", value: badge.color, noneLabel: "Aucune", onSave: (color) => savePocBadge(badge.id, { color }) }) }),
    editColumn({ id: "icon", header: "Icône", icon: <ShapesIcon />, edit: (badge) => ({ kind: "icon", value: badge.icon, onSave: (icon) => savePocBadge(badge.id, { icon }) }) }),
    numberColumn({
      id: "threshold",
      header: "Seuil",
      icon: <GaugeIcon />,
      value: (badge) => badge.threshold,
      edit: (badge) => ({ kind: "number", value: badge.threshold, min: 1, unit: COLLECTIONS[badge.collection].unit, onSave: (threshold) => savePocBadge(badge.id, { threshold }) }),
    }),
    editColumn({ id: "active", header: "Actif", icon: <ToggleRightIcon />, edit: (badge) => ({ kind: "switch", value: badge.active, onSave: (active) => savePocBadge(badge.id, { active }) }) }),
    dateColumn({
      id: "availableFrom",
      header: "Disponible dès",
      icon: <CalendarIcon />,
      value: (badge) => badge.availableFrom,
      edit: (badge) => ({ kind: "date", value: badge.availableFrom, onSave: (availableFrom) => savePocBadge(badge.id, { availableFrom }) }),
    }),
    dateColumn({
      id: "endsAt",
      header: "Fin",
      icon: <CalendarClockIcon />,
      time: true,
      value: (badge) => badge.endsAt,
      edit: (badge) => ({
        kind: "date",
        time: true,
        value: badge.endsAt,
        // Hangs on another field: refused before the call, in a bubble.
        validate: (endsAt) => (endsAt && badge.availableFrom && endsAt.slice(0, 10) < badge.availableFrom ? "La fin doit suivre « Disponible dès »." : null),
        onSave: (endsAt) => savePocBadge(badge.id, { endsAt }),
      }),
    }),
    numberColumn({ id: "holders", header: "Détenteurs", icon: <UsersIcon />, sortable: true, value: (badge) => badge.holders }),
    dateColumn({ id: "createdAt", header: "Création", icon: <CalendarPlusIcon />, sortable: true, value: (badge) => badge.createdAt }),
  ],
  groupings: [{ id: "collection", label: "Collection", title: (key) => COLLECTIONS[key as PocCollection].label }],
};

/** Rows kept in order: moved by the handle of the « Ordre » column. A click on a row opens its detail. */
export function PocOrderTable() {
  const { open, isOpen, activeId } = useSplitPanel();
  const version = usePocVersion();
  // Opened at once on its skeleton, the badge loaded by the panel.
  const openBadge = useCallback((badge: PocBadge) => open(<PocBadgePanel id={badge.id} />, { id: badge.id, title: badge.name }), [open]);
  const create = useCreateBadge();
  // A shared link: the badge of `?row=`, or a new one, once on arrival. Its ids never meet those of the accounts.
  useEffect(() => {
    const row = new URLSearchParams(window.location.search).get("row");
    const badge = BADGES.find((each) => each.id === row);
    if (badge) openBadge(badge);
    else if (row === NEW_BADGE) create();
  }, [openBadge, create]);
  const config = useMemo(() => ({ ...BADGES_TABLE, create: { label: "Nouveau badge", onClick: () => create() } }), [create]);
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-medium">Ordre</h2>
        <p className="text-sm text-muted-foreground">Glisser une ligne par sa poignée, triée par « Ordre », sans recherche ni filtre.</p>
        <p className="text-sm text-muted-foreground">
          « Nouveau badge » ou « Dupliquer » : un panneau vierge. Un nom déjà pris est refusé sous son champ, un nom contenant « 500 » échoue côté serveur.
        </p>
      </div>
      <DataTable config={config} onRowClick={openBadge} activeRowId={isOpen ? activeId : null} refreshKey={version} />
    </section>
  );
}

/** The `?row=` of a badge being created: shared, the link opens a blank one. */
export const NEW_BADGE = "new:badge";

/** Opens a blank badge in the panel, or one filled from `initial` (a copy); once created, the panel shows it. */
export function useCreateBadge() {
  const { open, replace, close } = useSplitPanel();
  return useCallback(
    (initial?: Partial<PocBadgeDraft>) =>
      open(
        <PocBadgeCreate
          initial={initial}
          onCancel={close}
          onCreated={(id) => replace(<PocBadgePanel id={id} />, { id, title: BADGES.find((each) => each.id === id)?.name })}
        />,
        { id: NEW_BADGE, title: initial ? "Copie de badge" : "Nouveau badge" },
      ),
    [open, replace, close],
  );
}
