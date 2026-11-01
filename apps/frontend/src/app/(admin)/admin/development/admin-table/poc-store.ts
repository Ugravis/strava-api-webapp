import { useSyncExternalStore } from "react";
import type { ActionResult } from "@/components/admin/action-state";
import { POC_USERS, type PocUser } from "./poc-data";
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

export async function savePocUser(id: string, patch: Partial<Pick<PocUser, "displayName" | "email" | "note" | "categories">>): Promise<ActionResult> {
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

type BadgePatch = Partial<Omit<PocBadge, "id" | "position" | "holders" | "createdAt" | "picture" | "name" | "collection" | "icon" | "threshold">> & {
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
