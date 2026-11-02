import { useSyncExternalStore } from "react";
import type { ActionResult } from "@/components/admin/action-state";
import type { DetailDraftResult } from "@/components/admin/detail";
import { POC_USERS, type PocUser } from "./poc-data";
import type { PocBadgeDraft } from "./poc-badge-create";
import { BADGES, type PocBadge } from "./poc-order";

/*
 * The fake server of the details: a row loaded by its id, saved after a
 * pause, and a version bumped by each save, which the table and the panel
 * follow to fetch again.
 */

let version = 0;
const listeners = new Set<() => void>();

/** Changes on every save: the `refreshKey` of the tables and the details. */
export function usePocVersion() {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => version,
    () => 0,
  );
}

function bump() {
  version += 1;
  listeners.forEach((listener) => listener());
}

const pause = (min: number, spread: number) => new Promise((resolve) => setTimeout(resolve, min + Math.random() * spread));

/** A copy, as an API would answer: the detail never shares the object of the table. */
export async function loadPocUser(id: string): Promise<PocUser | null> {
  await pause(400, 500);
  const user = POC_USERS.find((each) => each.id === id);
  return user ? structuredClone(user) : null;
}

export async function savePocUser(id: string, patch: Partial<Pick<PocUser, "displayName" | "email" | "note" | "categories" | "cover">>): Promise<ActionResult> {
  await pause(300, 300);
  if (patch.email !== undefined && !patch.email?.includes("@")) return { ok: false, message: "Adresse e-mail invalide." };
  const at = POC_USERS.findIndex((each) => each.id === id);
  if (at === -1) return { ok: false, message: "Ce compte n'existe plus." };
  // A new object, as an API would answer: the memoized rows see the change.
  POC_USERS[at] = { ...POC_USERS[at], ...patch };
  bump();
  return { ok: true, message: "Enregistré" };
}

export async function loadPocBadge(id: string): Promise<PocBadge | null> {
  await pause(300, 400);
  const badge = BADGES.find((each) => each.id === id);
  return badge ? structuredClone(badge) : null;
}

type BadgePatch = Partial<Omit<PocBadge, "id" | "position" | "holders" | "createdAt" | "picture" | "name" | "collection" | "icon" | "threshold" | "sports">> & {
  sports?: string[];
  // Edited fields may be cleared; these are refused when they are.
  name?: string | null;
  collection?: string | null;
  icon?: string | null;
  threshold?: number | null;
};

export async function savePocBadge(id: string, patch: BadgePatch): Promise<ActionResult> {
  await pause(300, 300);
  if (patch.name === null) return { ok: false, message: "Un badge a toujours un nom." };
  if (patch.icon === null) return { ok: false, message: "Un badge a toujours une icône." };
  if (patch.threshold === null) return { ok: false, message: "Un badge a toujours un seuil." };
  if (patch.collection === null) return { ok: false, message: "Un badge a toujours une collection." };
  const at = BADGES.findIndex((each) => each.id === id);
  if (at === -1) return { ok: false, message: "Ce badge n'existe plus." };
  BADGES[at] = { ...BADGES[at]!, ...(patch as Partial<PocBadge>) };
  bump();
  return { ok: true, message: "Enregistré" };
}

/**
 * A badge created from its draft, at the end of the order: refused under its
 * field when its name is taken, failing as a whole when it holds « 500 ».
 */
export async function createPocBadge(draft: PocBadgeDraft): Promise<DetailDraftResult> {
  await pause(500, 400);
  const name = draft.name!.trim();
  if (name.includes("500")) return { ok: false, message: "Le serveur n'a pas répondu (500). Réessayer." };
  if (BADGES.some((each) => each.name.toLowerCase() === name.toLowerCase())) return { ok: false, field: "name", message: "Un badge porte déjà ce nom." };
  const id = `${draft.collection}-${Date.now().toString(36)}`;
  // Uploaded, as a Server Action would, its URL answered.
  const src = draft.picture instanceof File ? URL.createObjectURL(draft.picture) : draft.picture;
  BADGES.push({
    id,
    name,
    collection: draft.collection!,
    position: BADGES.length + 1,
    holders: 0,
    createdAt: new Date().toISOString(),
    picture: src ? { src, alt: `Image du badge ${name}` } : null,
    color: draft.color,
    icon: draft.icon!,
    threshold: draft.threshold!,
    active: draft.active,
    availableFrom: draft.availableFrom,
    endsAt: draft.endsAt,
    description: draft.description,
    // Counted by a distance only.
    sports: draft.collection === "distance" ? draft.sports : [],
  });
  bump();
  return { ok: true, id, message: `Badge « ${name} » créé` };
}
