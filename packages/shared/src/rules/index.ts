/**
 * The rules of the fields of a row, written once: checked by the forms of
 * the back office as they are typed, and by the API before it saves, with
 * the same messages. Dependency free, so that both sides import it.
 */

export type FieldRule =
  | { type: "text"; required?: boolean; minLength?: number; maxLength?: number; pattern?: RegExp; patternMessage?: string }
  | { type: "email"; required?: boolean; maxLength?: number }
  /** `http` or `https` only. */
  | { type: "url"; required?: boolean; maxLength?: number }
  | { type: "number"; required?: boolean; min?: number; max?: number; integer?: boolean; unit?: string }
  /** A day `YYYY-MM-DD` or an ISO instant; `after` another date field of the row, `message` telling why. */
  | { type: "date"; required?: boolean; after?: { field: string; message: string } }
  /** One of `values`. */
  | { type: "choice"; required?: boolean; values: readonly string[] }
  /** Several values: of `values` when given, each of `maxLength` at most. */
  | { type: "list"; required?: boolean; minItems?: number; maxItems?: number; values?: readonly string[]; maxLength?: number }
  /** The id of another row. */
  | { type: "reference"; required?: boolean }
  | { type: "boolean" };

/** The rules of a row, by field. */
export type FieldRules<T> = { [K in keyof T]?: FieldRule };

/** A field refused: its name and why. */
export interface FieldError {
  field: string;
  message: string;
}

export const RULE_REQUIRED = "Champ obligatoire.";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fr = (value: number) => value.toLocaleString("fr-FR");
const plural = (count: number, word: string) => `${fr(count)} ${word}${count > 1 ? "s" : ""}`;

/** No value: nothing typed, none picked. */
export const isEmptyRuleValue = (value: unknown) => value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);

/** The bounds of a number in words, e.g. « entre 1 et 100 km »; null without bounds. */
export function numberBounds(min: number | undefined, max: number | undefined, unit?: string) {
  const shown = (value: number) => `${fr(value)}${unit ? ` ${unit}` : ""}`;
  if (min !== undefined && max !== undefined) return `entre ${fr(min)} et ${shown(max)}`;
  if (min !== undefined) return `d'au moins ${shown(min)}`;
  if (max !== undefined) return `d'au plus ${shown(max)}`;
  return null;
}

/** Why `value` breaks `rule`, or null; `values` the row, for a rule hanging on another field. */
export function checkField(rule: FieldRule, value: unknown, values: Record<string, unknown> = {}): string | null {
  if (rule.type === "boolean") return null;
  if (isEmptyRuleValue(value)) return rule.required ? RULE_REQUIRED : null;
  switch (rule.type) {
    case "text":
    case "email":
    case "url": {
      if (typeof value !== "string") return "Texte attendu.";
      if (rule.type === "text" && rule.minLength !== undefined && value.length < rule.minLength) return `${plural(rule.minLength, "caractère")} au moins.`;
      if (rule.maxLength !== undefined && value.length > rule.maxLength) return `${plural(rule.maxLength, "caractère")} au plus.`;
      if (rule.type === "text" && rule.pattern && !rule.pattern.test(value)) return rule.patternMessage ?? "Format invalide.";
      if (rule.type === "email" && !EMAIL.test(value)) return "Adresse e-mail invalide, par exemple nom@exemple.fr.";
      if (rule.type === "url") {
        try {
          if (!["http:", "https:"].includes(new URL(value).protocol)) throw new Error();
        } catch {
          return "Lien invalide, par exemple https://exemple.fr.";
        }
      }
      return null;
    }
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) return "Nombre attendu.";
      if (rule.integer && !Number.isInteger(value)) return "Nombre entier attendu.";
      if ((rule.min !== undefined && value < rule.min) || (rule.max !== undefined && value > rule.max)) return `Le nombre doit être ${numberBounds(rule.min, rule.max, rule.unit)}.`;
      return null;
    }
    case "date": {
      if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return "Date invalide.";
      const start = rule.after && values[rule.after.field];
      // Compared by day: a day `YYYY-MM-DD` against an instant.
      if (typeof start === "string" && value.slice(0, 10) < start.slice(0, 10)) return rule.after!.message;
      return null;
    }
    case "choice":
      return typeof value === "string" && rule.values.includes(value) ? null : "Choix inconnu.";
    case "list": {
      if (!Array.isArray(value)) return "Liste attendue.";
      if (rule.minItems !== undefined && value.length < rule.minItems) return `${plural(rule.minItems, "valeur")} au moins.`;
      if (rule.maxItems !== undefined && value.length > rule.maxItems) return `${plural(rule.maxItems, "valeur")} au plus.`;
      if (rule.values && value.some((each) => !rule.values!.includes(each))) return "Choix inconnu.";
      if (rule.maxLength !== undefined && value.some((each) => typeof each === "string" && each.length > rule.maxLength!)) return `${plural(rule.maxLength, "caractère")} au plus par valeur.`;
      return null;
    }
    case "reference":
      return null;
  }
}

/**
 * The first field of `values` breaking its rule, or null. `partial`: only the
 * fields given are checked (a patch), the others of the row read from `row`
 * for the rules hanging on them.
 */
export function checkRules<T>(rules: FieldRules<T>, values: Partial<T>, { partial = false, row = {} }: { partial?: boolean; row?: Partial<T> } = {}): FieldError | null {
  const all = { ...row, ...values } as Record<string, unknown>;
  for (const [field, rule] of Object.entries(rules) as [string, FieldRule | undefined][]) {
    // A patch: its fields, and those hanging on one of them.
    const touched = field in values || (rule?.type === "date" && !!rule.after && rule.after.field in values);
    if (!rule || (partial && !touched)) continue;
    const message = checkField(rule, all[field], all);
    if (message) return { field, message };
  }
  return null;
}
