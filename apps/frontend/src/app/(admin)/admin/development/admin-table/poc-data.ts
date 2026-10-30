import type { AdminRole, AdminUserTagLook } from "@kilotrace/shared/admin";

/*
 * Fake rows of the table POC, shaped as the back office ones, with their
 * edge cases: missing values, long texts, many icons, large numbers.
 * Deterministic, so that the server and the browser render the same rows.
 */

export interface PocUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: null;
  email: string;
  roles: AdminRole[];
  status: "active" | "suspended" | "staff";
  createdAt: string;
  lastSeenAt: string | null;
  activitiesCount: number;
  storageBytes: number;
  stravaConnected: boolean;
  signInMethods: ("password" | "google")[];
  userTags: AdminUserTagLook[];
  note: string | null;
  /** Latest action of the team on the account. */
  lastAction: { kind: PocActionKind; label: string; failedStatus: number | null } | null;
  categories: PocCategory[];
  /** Key of the avatar in the bucket. */
  avatarKey: string | null;
}

/** Fixed, so that relative dates do not drift between renders. */
export const POC_NOW = Date.parse("2026-10-29T10:00:00Z");
const DAY = 86_400_000;

/** Mulberry32: spread values even from close seeds. */
function random(seed: number) {
  let state = seed * 2_654_435_761;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const TAGS: AdminUserTagLook[] = [
  { id: "t1", name: "Bêta-testeur", icon: "rocket", color: "#7c3aed" },
  { id: "t2", name: "Fondateur", icon: "crown", color: "#d97706" },
  { id: "t3", name: "Contributeur", icon: "gem", color: "#0891b2" },
  { id: "t4", name: "Ambassadeur", icon: "flag", color: "#dc2626" },
  { id: "t5", name: "Série de 100 jours", icon: "flame", color: "#ea580c" },
  { id: "t6", name: "Sans couleur", icon: "medal", color: null },
];

export type PocActionKind = "suspend" | "reset" | "tag" | "unsuspend";
const ACTIONS: [PocActionKind, string][] = [
  ["suspend", "Suspension du compte"],
  ["reset", "Réinitialisation du nom affiché et de la bio après signalement"],
  ["tag", "Tag attribué : Bêta-testeur"],
  ["unsuspend", "Levée de suspension"],
];

export type PocCategory = "runner" | "cyclist" | "hiker" | "swimmer" | "triathlete";
const CATEGORIES: PocCategory[] = ["runner", "cyclist", "hiker", "swimmer", "triathlete"];

const NAMES: [string, string | null][] = [
  ["alice_martin", "Alice Martin"],
  ["bob", null],
  ["jean_baptiste_de_la_fontaine_du_moulin", "Jean-Baptiste de La Fontaine du Moulin-Vieux"],
  ["chloe.r", "Chloé Rousseau"],
  ["x", "X"],
  ["marathon_man_75", "Marc Dubois"],
  ["lea_velo", "Léa"],
  ["tom_trail", "Thomas Lefèvre"],
  ["sarah.k", "Sarah Kowalski"],
  ["nico_runs", null],
  ["emma_b", "Emma Bernard"],
  ["hugo.p", "Hugo Petit"],
];

export const POC_USERS: PocUser[] = Array.from({ length: 57 }, (_, index) => {
  const next = random(index + 1);
  const [base, name] = NAMES[index % NAMES.length]!;
  const username = index < NAMES.length ? base : `${base}${index}`;
  const roles: AdminRole[] = index === 0 ? ["super-admin"] : index === 3 ? ["admin", "support"] : index === 8 ? ["support"] : [];
  const suspended = index % 9 === 4;
  const createdAt = POC_NOW - Math.floor(next() * 900 + 1) * DAY;
  const seen = index % 7 === 1 ? null : POC_NOW - Math.floor(next() ** 3 * 200 * DAY);
  return {
    id: `0b7e${index.toString(16).padStart(4, "0")}-5c1d-4f2a-9e8b-${(index * 7919).toString(16).padStart(12, "0")}`,
    username,
    displayName: name,
    avatarUrl: null,
    email: index === 2 ? "jean-baptiste.delafontainedumoulinvieux@exemple-tres-long.fr" : `${username}@exemple.fr`,
    roles,
    status: roles.length > 0 ? "staff" : suspended ? "suspended" : "active",
    createdAt: new Date(createdAt).toISOString(),
    lastSeenAt: seen === null ? null : new Date(Math.max(seen, createdAt)).toISOString(),
    activitiesCount: index === 5 ? 12_345 : index % 6 === 1 ? 0 : Math.floor(next() * 800),
    storageBytes: index === 2 ? 3_650_000_000 : index % 5 === 3 ? 0 : Math.floor(next() * 40_000_000),
    stravaConnected: index % 4 !== 2,
    signInMethods: index % 3 === 0 ? ["google"] : index % 3 === 1 ? ["password"] : index % 10 === 5 ? [] : ["password", "google"],
    userTags: index === 0 ? TAGS : TAGS.filter((_, tag) => (index + tag) % 5 === 0).slice(0, index % 4),
    note:
      index % 5 === 2
        ? "Compte signalé deux fois pour des activités en double ; vérifié avec la personne par e-mail, rien à faire pour l'instant."
        : index % 7 === 3
          ? "Testeur"
          : null,
    lastAction:
      index % 4 === 3
        ? null
        : { kind: ACTIONS[index % ACTIONS.length]![0], label: ACTIONS[index % ACTIONS.length]![1], failedStatus: index % 8 === 5 ? 403 : null },
    // None to all five, to see the pills overflow.
    categories: index === 2 ? CATEGORIES : CATEGORIES.filter((_, at) => (index + at * 3) % 7 < 2),
    avatarKey: index % 3 === 2 ? null : `avatars/${index.toString(16).padStart(8, "0")}-5c1d-4f2a-9e8b/${1_729_000_000 + index * 4_513}.webp`,
  };
});
