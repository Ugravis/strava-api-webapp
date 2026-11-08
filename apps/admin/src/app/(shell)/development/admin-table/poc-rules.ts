import type { FieldRules } from "@kilotrace/shared/rules";
import type { PocBadgeDraft } from "./poc-badge-create";
import type { PocUser } from "./poc-data";

/*
 * The rules of the fake rows, written once as a real entity would in
 * `@kilotrace/shared`: followed by the forms as they are typed, and by the
 * fake server (`poc-store.ts`) before it saves, as the API would with
 * `assertRules`.
 */

export const BADGE_RULES: FieldRules<PocBadgeDraft> = {
  name: { type: "text", required: true, maxLength: 40 },
  collection: { type: "choice", required: true, values: ["distance", "tiles", "stations"] },
  icon: { type: "text", required: true },
  color: { type: "text", pattern: /^#[0-9a-f]{6}$/i, patternMessage: "Couleur au format #rrggbb." },
  threshold: { type: "number", required: true, min: 1, integer: true },
  availableFrom: { type: "date" },
  endsAt: { type: "date", after: { field: "availableFrom", message: "La fin doit suivre « Disponible dès »." } },
  description: { type: "text", maxLength: 500 },
  sports: { type: "list", values: ["run", "ride", "walk", "hike", "ski", "swim"] },
  keywords: { type: "list", maxItems: 6, maxLength: 20 },
};

export const USER_RULES: FieldRules<PocUser> = {
  displayName: { type: "text", maxLength: 50 },
  email: { type: "email", required: true, maxLength: 120 },
  website: { type: "url", maxLength: 200 },
  bio: { type: "text", maxLength: 1000 },
  keywords: { type: "list", maxItems: 8, maxLength: 24 },
  note: { type: "text", maxLength: 2000 },
  referrer: { type: "reference" },
};
