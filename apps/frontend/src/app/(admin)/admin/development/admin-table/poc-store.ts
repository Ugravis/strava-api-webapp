import { checkField, checkRules } from "@kilotrace/shared/rules";
import { useSyncExternalStore } from "react";
import type { ActionResult } from "@kilotrace/ui/components/admin/action-state";
import type { BulkEditChange, DetailDraftResult, DetailEditOption } from "@kilotrace/ui/components/admin/detail";
import type { PocBadgeDraft } from "./poc-badge-create";
import { POC_NOW, POC_USERS, type PocUser } from "./poc-data";
import { BADGES, type PocBadge } from "./poc-order";
import { BADGE_RULES, USER_RULES } from "./poc-rules";

/*
 * The fake server of the details: a row loaded by its id, saved after a
 * pause, judged by the shared rules of its row (`poc-rules.ts`) as the API
 * would, and a version bumped by each save, which the table and the panel
 * follow to fetch again. With it, the settings of the simulation: the role
 * of the user and what follows a removal.
 */

let version = 0;
const listeners = new Set<() => void>();
const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => void listeners.delete(onChange);
};

/** Changes on every save: the `refreshKey` of the tables and the details. */
export function usePocVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

function bump() {
  version += 1;
  listeners.forEach((listener) => listener());
}

const pause = (min: number, spread: number) => new Promise((resolve) => setTimeout(resolve, min + Math.random() * spread));

/* The simulation. */

export interface PocSettings {
  /** A moderator may not edit what is locked to super-admins. */
  role: "super-admin" | "moderator";
  /** What the panel shows after a removal. */
  afterRemove: "close" | "next";
}
const DEFAULT_SETTINGS: PocSettings = { role: "super-admin", afterRemove: "close" };
let settings = DEFAULT_SETTINGS;

export function usePocSettings() {
  return useSyncExternalStore(subscribe, () => settings, () => DEFAULT_SETTINGS);
}
export function setPocSettings(patch: Partial<PocSettings>) {
  settings = { ...settings, ...patch };
  bump();
}

export const SUPER_ADMIN_ONLY = "Réservé aux super-admins";
/** Why a moderator may not do it; null for a super-admin. Read at render: the tables draw again as it changes. */
export const pocLock = () => (settings.role === "moderator" ? SUPER_ADMIN_ONLY : null);
const refusedLocked = (): ActionResult | null => (pocLock() ? { ok: false, message: `${SUPER_ADMIN_ONLY}.` } : null);

/* Accounts. */

/** A copy, as an API would answer: the detail never shares the object of the table. */
export async function loadPocUser(id: string): Promise<PocUser | null> {
  await pause(400, 500);
  const user = POC_USERS.find((each) => each.id === id);
  return user ? structuredClone(user) : null;
}

type UserPatch = Partial<Pick<PocUser, "displayName" | "email" | "note" | "categories" | "cover" | "website" | "bio" | "keywords" | "referrer" | "status">>;

const FIELD_NAMES: Partial<Record<keyof PocUser, string>> = {
  displayName: "Nom affiché",
  email: "E-mail",
  note: "Note",
  categories: "Catégories",
  cover: "Couverture",
  website: "Site web",
  bio: "Bio",
  keywords: "Mots-clés",
  referrer: "Parrain",
};

export async function savePocUser(id: string, patch: UserPatch): Promise<ActionResult> {
  await pause(300, 300);
  const at = POC_USERS.findIndex((each) => each.id === id);
  if (at === -1) return { ok: false, message: "Ce compte n'existe plus." };
  const user = POC_USERS[at]!;
  const refused = checkRules(USER_RULES, patch, { partial: true, row: user });
  if (refused) return { ok: false, message: refused.message };
  for (const key of Object.keys(patch) as (keyof UserPatch)[]) {
    if (FIELD_NAMES[key]) record(id, "edit", `${FIELD_NAMES[key]} modifié`, shown(patch[key]));
  }
  // A new object, as an API would answer: the memoized rows see the change.
  POC_USERS[at] = { ...user, ...patch };
  bump();
  return { ok: true, message: "Enregistré" };
}

const shown = (value: unknown) =>
  value === null || value === undefined || (Array.isArray(value) && value.length === 0)
    ? "Effacé"
    : Array.isArray(value)
      ? value.join(", ")
      : typeof value === "object" && "label" in value
        ? String(value.label)
        : typeof value === "string" && value.length > 60
          ? `${value.slice(0, 60)}…`
          : typeof value === "object"
            ? "Image remplacée"
            : String(value);

/** Accounts found by their name, for a `relation`; « erreur » fails, to see it told. */
export async function searchPocUsers(query: string): Promise<DetailEditOption[]> {
  await pause(250, 400);
  if (query.toLowerCase() === "erreur") throw new Error("503");
  const words = query.toLowerCase();
  return POC_USERS.filter((user) => !words || user.username.includes(words) || user.displayName?.toLowerCase().includes(words))
    .slice(0, 8)
    .map((user) => ({ value: user.id, label: user.displayName ?? `@${user.username}`, description: `@${user.username}` }));
}

/** Suspends accounts, the staff refused; `reason` kept in their history. */
export async function suspendPocUsers(ids: string[], reason: string | undefined): Promise<ActionResult> {
  await pause(400, 400);
  const staff = POC_USERS.filter((user) => ids.includes(user.id) && user.status === "staff");
  if (staff.length > 0) return { ok: false, message: `Un membre de l'équipe ne peut pas être suspendu (@${staff[0]!.username}).` };
  POC_USERS.forEach((user, at) => {
    if (!ids.includes(user.id)) return;
    POC_USERS[at] = { ...user, status: "suspended" };
    record(user.id, "suspend", "Suspension du compte", reason ? `Motif : ${reason}` : undefined);
  });
  bump();
  return { ok: true, message: ids.length > 1 ? `${ids.length} comptes suspendus` : "Compte suspendu" };
}

/** Deletes accounts: super-admins only, the server judging too. */
export async function removePocUsers(ids: string[]): Promise<ActionResult> {
  await pause(400, 400);
  const locked = refusedLocked();
  if (locked) return locked;
  for (const id of ids) {
    const at = POC_USERS.findIndex((user) => user.id === id);
    if (at !== -1) POC_USERS.splice(at, 1);
  }
  bump();
  return { ok: true, message: ids.length > 1 ? `${ids.length} comptes supprimés` : "Compte supprimé" };
}

/** A list changed on several rows: replaced, or values added or removed. */
function changeList(current: string[], change: BulkEditChange) {
  const values = change.value as string[];
  if (change.mode === "replace") return values;
  if (change.mode === "add") return [...current, ...values.filter((value) => !current.includes(value))];
  return current.filter((value) => !values.includes(value));
}

export async function bulkEditPocUsers(ids: string[], change: BulkEditChange): Promise<ActionResult> {
  await pause(400, 400);
  const key = change.field as keyof UserPatch;
  const rule = USER_RULES[key];
  const next = POC_USERS.filter((user) => ids.includes(user.id)).map((user) => {
    const value = Array.isArray(user[key]) ? changeList(user[key] as string[], change) : change.value;
    return { user, value, refused: rule ? checkField(rule, value) : null };
  });
  const refused = next.find((each) => each.refused);
  // All or none: a row refused leaves every other as it was.
  if (refused) return { ok: false, message: `@${refused.user.username} : ${refused.refused}` };
  for (const { user, value } of next) {
    POC_USERS[POC_USERS.indexOf(user)] = { ...user, [key]: value };
    record(user.id, "edit", `${FIELD_NAMES[key] ?? key} modifié en lot`, shown(value));
  }
  bump();
  return { ok: true, message: `${FIELD_NAMES[key] ?? key} : ${ids.length} compte${ids.length > 1 ? "s" : ""} modifié${ids.length > 1 ? "s" : ""}` };
}

/* The history of an account: made up from it at first, then each change. */

export interface PocEvent {
  id: string;
  kind: "signup" | "seen" | "tag" | "suspend" | "action" | "edit";
  title: string;
  date: string;
  details?: string;
  failed?: boolean;
}

const DAY = 86_400_000;
const HISTORY = new Map<string, PocEvent[]>();
let events = 0;

function historyOf(user: PocUser): PocEvent[] {
  let list = HISTORY.get(user.id);
  if (list) return list;
  const now = POC_NOW;
  const before = (from: number, days: number) => new Date(from - days * DAY).toISOString();
  const seen = user.lastSeenAt ? Date.parse(user.lastSeenAt) : now;
  list = [
    { id: `${user.id}-signup`, kind: "signup" as const, title: "Inscription", date: user.createdAt, details: `Par ${user.signInMethods.includes("google") ? "Google" : "e-mail"}` },
    ...(user.lastSeenAt ? [{ id: `${user.id}-seen`, kind: "seen" as const, title: "Dernière visite", date: user.lastSeenAt }] : []),
    ...user.userTags.map((tag, at) => ({ id: `${user.id}-tag-${tag.id}`, kind: "tag" as const, title: `Tag « ${tag.name} » ajouté`, date: before(seen, 3 + at * 5), details: "Par @alice_martin" })),
    ...(user.lastAction
      ? [{ id: `${user.id}-action`, kind: "action" as const, title: user.lastAction.label, date: before(now, 2), details: user.lastAction.failedStatus ? `Échec : ${user.lastAction.failedStatus}` : "Par @alice_martin", failed: !!user.lastAction.failedStatus }]
      : []),
    // Older visits, so that the history has pages.
    ...Array.from({ length: 6 }, (_, at) => ({ id: `${user.id}-visit-${at}`, kind: "seen" as const, title: "Connexion", date: before(seen, 20 + at * 30), details: at % 2 ? "Depuis l'application" : "Depuis le site" })),
  ].filter((event) => event.date >= user.createdAt) as PocEvent[];
  list.sort((a, b) => b.date.localeCompare(a.date));
  HISTORY.set(user.id, list);
  return list;
}

function record(userId: string, kind: PocEvent["kind"], title: string, details?: string) {
  const user = POC_USERS.find((each) => each.id === userId);
  if (!user) return;
  historyOf(user).unshift({ id: `event-${++events}`, kind, title, date: new Date().toISOString(), details: details ? `${details} · par @alice_martin` : "Par @alice_martin" });
}

/** Five events at a time, the latest first; `cursor` the index of the next one. */
export async function loadPocUserHistory(id: string, cursor: string | null): Promise<{ events: PocEvent[]; next: string | null; total: number }> {
  await pause(300, 400);
  const user = POC_USERS.find((each) => each.id === id);
  if (!user) return { events: [], next: null, total: 0 };
  const all = historyOf(user);
  const from = cursor ? Number(cursor) : 0;
  return { events: all.slice(from, from + 5), next: from + 5 < all.length ? String(from + 5) : null, total: all.length };
}

/* Badges. */

export async function loadPocBadge(id: string): Promise<PocBadge | null> {
  await pause(300, 400);
  const badge = BADGES.find((each) => each.id === id);
  return badge ? structuredClone(badge) : null;
}

type BadgePatch = Partial<Omit<PocBadge, "id" | "position" | "holders" | "createdAt" | "picture" | "name" | "collection" | "icon" | "threshold" | "sports">> & {
  sports?: string[];
  // Edited fields may be cleared; the rules refuse them then.
  name?: string | null;
  collection?: string | null;
  icon?: string | null;
  threshold?: number | null;
};

export async function savePocBadge(id: string, patch: BadgePatch): Promise<ActionResult> {
  await pause(300, 300);
  const at = BADGES.findIndex((each) => each.id === id);
  if (at === -1) return { ok: false, message: "Ce badge n'existe plus." };
  if (("collection" in patch || "threshold" in patch) && pocLock()) return refusedLocked()!;
  const refused = checkRules(BADGE_RULES, patch as Partial<PocBadgeDraft>, { partial: true, row: BADGES[at] as unknown as PocBadgeDraft });
  if (refused) return { ok: false, message: refused.message };
  BADGES[at] = { ...BADGES[at]!, ...(patch as Partial<PocBadge>) };
  bump();
  return { ok: true, message: "Enregistré" };
}

/**
 * A badge created from its draft, at the end of the order, judged by its
 * rules: refused under its field when its name is taken, failing as a whole
 * when it holds « 500 ».
 */
export async function createPocBadge(draft: PocBadgeDraft): Promise<DetailDraftResult> {
  await pause(500, 400);
  const refused = checkRules(BADGE_RULES, draft);
  if (refused) return { ok: false, ...refused };
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
    keywords: draft.keywords,
  });
  bump();
  return { ok: true, id, message: `Badge « ${name} » créé` };
}

/** Deletes badges, the others numbered again: super-admins only. */
export async function removePocBadges(ids: string[]): Promise<ActionResult> {
  await pause(400, 400);
  const locked = refusedLocked();
  if (locked) return locked;
  for (const id of ids) {
    const at = BADGES.findIndex((badge) => badge.id === id);
    if (at !== -1) BADGES.splice(at, 1);
  }
  BADGES.sort((a, b) => a.position - b.position).forEach((badge, index) => (badge.position = index + 1));
  bump();
  return { ok: true, message: ids.length > 1 ? `${ids.length} badges supprimés` : "Badge supprimé" };
}

const BADGE_FIELDS: Record<string, string> = { collection: "Collection", color: "Couleur", icon: "Icône", active: "Actif", threshold: "Seuil", sports: "Sports", keywords: "Mots-clés" };

export async function bulkEditPocBadges(ids: string[], change: BulkEditChange): Promise<ActionResult> {
  await pause(400, 400);
  if ((change.field === "collection" || change.field === "threshold") && pocLock()) return refusedLocked()!;
  const key = change.field as keyof PocBadge;
  const rule = BADGE_RULES[key as keyof PocBadgeDraft];
  const next = BADGES.filter((badge) => ids.includes(badge.id)).map((badge) => {
    const value = Array.isArray(badge[key]) ? changeList(badge[key] as string[], change) : change.value;
    return { badge, value, refused: rule ? checkField(rule, value) : null };
  });
  const refused = next.find((each) => each.refused);
  if (refused) return { ok: false, message: `${refused.badge.name} : ${refused.refused}` };
  for (const { badge, value } of next) BADGES[BADGES.indexOf(badge)] = { ...badge, [key]: value };
  bump();
  return { ok: true, message: `${BADGE_FIELDS[key] ?? key} : ${ids.length} badge${ids.length > 1 ? "s" : ""} modifié${ids.length > 1 ? "s" : ""}` };
}

/**
 * The holders of a badge from `offset`, five at a time, as the API would page
 * them; as many as the fake accounts allow, the total told as is.
 */
export async function loadPocBadgeHolders(id: string, offset: number): Promise<{ items: PocUser[]; total: number }> {
  await pause(300, 500);
  const badge = BADGES.find((each) => each.id === id);
  if (!badge || badge.holders === 0) return { items: [], total: 0 };
  const seed = badge.id.length + badge.position;
  const holders = POC_USERS.filter((_, at) => (at + seed) % 2 === 0).slice(0, badge.holders);
  return { items: holders.slice(offset, offset + 5), total: Math.min(badge.holders, holders.length) };
}
