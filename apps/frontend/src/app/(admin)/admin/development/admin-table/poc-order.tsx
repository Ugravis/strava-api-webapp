"use client";

import { CalendarPlusIcon, LayersIcon, MedalIcon, UsersIcon } from "lucide-react";
import {
  DataTable,
  type DataTableConfig,
  dateColumn,
  localTableSource,
  numberColumn,
  orderColumn,
  pillsColumn,
  type TableMove,
  textColumn,
  type Tone,
} from "@/components/admin/data-table";

/*
 * Fake badges kept in one order of the database, whatever their collection:
 * the showcase of the rows moved by drag and drop.
 */

type PocCollection = "distance" | "tiles" | "stations";

interface PocBadge {
  id: string;
  name: string;
  collection: PocCollection;
  /** From 1. */
  position: number;
  holders: number;
  createdAt: string;
}

const COLLECTIONS: Record<PocCollection, { label: string; tone: Tone }> = {
  distance: { label: "Distance", tone: "blue" },
  tiles: { label: "Tuiles", tone: "fuchsia" },
  stations: { label: "Gares", tone: "amber" },
};

const NAMES: Record<PocCollection, string[]> = {
  distance: ["Premier kilomètre", "Semi-marathon", "Marathon", "Tour de France", "Équateur"],
  tiles: ["Première tuile", "Carré 5×5", "Carré 10×10", "Grand carré"],
  stations: ["Première gare", "Dix gares", "Cent gares", "Toutes les gares d'une ligne", "Gare frontalière"],
};

/** Changed by the moves, like a database would be. */
const BADGES: PocBadge[] = (Object.keys(NAMES) as PocCollection[]).flatMap((collection, at) =>
  NAMES[collection].map((name, index) => ({
    id: `${collection}-${index + 1}`,
    name,
    collection,
    position: 0,
    holders: Math.round(1200 / (index + 1) ** 1.6) + at * 7,
    createdAt: new Date(Date.UTC(2026, 3 + at, 2 + index * 9)).toISOString(),
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

const BADGES_TABLE: DataTableConfig<PocBadge> = {
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
    textColumn({ id: "name", header: "Badge", icon: <MedalIcon />, sortable: true, locked: true, value: (badge) => badge.name, width: "max-w-56" }),
    pillsColumn({ id: "collection", header: "Collection", icon: <LayersIcon />, value: (badge) => [COLLECTIONS[badge.collection]] }),
    numberColumn({ id: "holders", header: "Détenteurs", icon: <UsersIcon />, sortable: true, value: (badge) => badge.holders }),
    dateColumn({ id: "createdAt", header: "Création", icon: <CalendarPlusIcon />, sortable: true, value: (badge) => badge.createdAt }),
  ],
  groupings: [{ id: "collection", label: "Collection", title: (key) => COLLECTIONS[key as PocCollection].label }],
};

/** Rows kept in order: moved by the handle of the « Ordre » column. */
export function PocOrderTable() {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-medium">Ordre</h2>
        <p className="text-sm text-muted-foreground">Glisser une ligne par sa poignée, triée par « Ordre », sans recherche ni filtre.</p>
      </div>
      <DataTable config={BADGES_TABLE} />
    </section>
  );
}
