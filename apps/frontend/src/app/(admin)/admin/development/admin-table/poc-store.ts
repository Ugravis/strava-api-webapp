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

export async function savePocUser(id: string, patch: Partial<Pick<PocUser, "displayName" | "email" | "note">>): Promise<ActionResult> {
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

export async function savePocBadge(id: string, patch: { name: string | null }): Promise<ActionResult> {
  await pause(300, 300);
  const { name } = patch;
  if (name === null) return { ok: false, message: "Un badge a toujours un nom." };
  const at = BADGES.findIndex((each) => each.id === id);
  if (at === -1) return { ok: false, message: "Ce badge n'existe plus." };
  BADGES[at] = { ...BADGES[at], name };
  bump();
  return { ok: true, message: "Enregistré" };
}
