import { checkField, type FieldRule } from "@kilotrace/shared/rules";
import { useState } from "react";
import { formatDate, formatDateTime, formatNumber } from "@/components/admin/data-table";
import type { DetailEditOption, DetailFieldEdit, InlineEdit, Save } from "./edit-types";

/* What the kinds of values of `edit-types` share: their rules, their saving, their text. */

/**
 * The options of an edit following a shared rule (`@kilotrace/shared/rules`):
 * `required`, the bounds of a number, `validate`. Spread in an `edit`, its
 * own keys after; `row` the values a rule hangs on.
 */
export function fromRule(rule: FieldRule | undefined, row?: object): { required?: boolean; min?: number; max?: number; validate?: (value: unknown) => string | null } {
  if (!rule) return {};
  return {
    required: "required" in rule ? rule.required : undefined,
    ...(rule.type === "number" ? { min: rule.min, max: rule.max } : {}),
    validate: (value: unknown) => checkField(rule, value && typeof value === "object" && "value" in value ? (value as DetailEditOption).value : value, row as Record<string, unknown>),
  };
}

/**
 * Saves a value, unless unchanged, then calls `close`. Refused by `validate`
 * or by the server, it stays open, the reason in `error` (a bubble above the
 * field), until `setError(null)` as the value changes.
 */
export function useCommit(edit: DetailFieldEdit, close: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const commit = async (next: unknown) => {
    if (saving || edit.locked) return;
    // A file is always new.
    if (sameValue(next, edit.value)) return close();
    // A draft judges its fields as a whole, on submitting.
    const cleared = !edit.draft && edit.required && isEmptyValue(next);
    const refused = cleared ? REQUIRED : (edit.validate as ((value: unknown) => string | null) | undefined)?.(next);
    if (refused) return setError(refused);
    setSaving(true);
    setError(null);
    try {
      const outcome = await (edit.onSave as Save<unknown>)(next);
      if (outcome && !outcome.ok) setError(outcome.message);
      else close();
    } catch {
      setError("La modification n'a pas pu être enregistrée.");
    } finally {
      setSaving(false);
    }
  };
  return { saving, commit, error, setError };
}

export const REQUIRED = "Champ obligatoire.";
/** Equal values; a file picked never is. */
export const sameValue = (a: unknown, b: unknown) => !(a instanceof File) && !(b instanceof File) && JSON.stringify(a) === JSON.stringify(b);
/** No value: nothing typed, none picked; a switch always has one. */
export const isEmptyValue = (value: unknown) => value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);

const labelsOf = (options: DetailEditOption[], values: string[]) =>
  values.map((value) => options.find((option) => option.value === value)?.label ?? value);

/** The text copied of an edited value, as the columns of the tables copy theirs. */
export function editCopy(edit: DetailFieldEdit): string | null {
  switch (edit.kind) {
    case "number":
      return edit.value === null ? null : String(edit.value);
    case "date":
      return edit.value && (edit.time ? formatDateTime(edit.value) : formatDate(edit.value));
    case "select":
      return edit.value && labelsOf(edit.options, [edit.value])[0]!;
    case "multiselect":
      return edit.value.length > 0 ? labelsOf(edit.options, edit.value).join(", ") : null;
    case "switch":
      return null;
    case "image":
      return edit.value;
    case "tags":
      return edit.value.length > 0 ? edit.value.join(", ") : null;
    case "relation":
      return edit.value?.label ?? null;
    default:
      return edit.value || null;
  }
}

/** Is there anything to show: « — » otherwise. */
export const editEmpty = (edit: DetailFieldEdit) => (edit.kind === "multiselect" || edit.kind === "tags" ? edit.value.length === 0 : edit.kind !== "switch" && (edit.value === null || edit.value === ""));

const pad = (value: number) => String(value).padStart(2, "0");
/** An ISO instant as `datetime-local` types it, in the time zone of the browser. */
const toLocal = (iso: string) => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const draftOf = (edit: InlineEdit) =>
  edit.value === null ? "" : edit.kind === "number" ? String(edit.value) : edit.kind === "date" && edit.time ? toLocal(edit.value) : edit.value;

/** The bounds of a number in words, e.g. « entre 1 et 100 km », « d'au moins 1 km »; none without bounds. */
function numberBounds({ min, max, unit }: Extract<InlineEdit, { kind: "number" }>) {
  const shown = (value: number) => `${formatNumber(value)}${unit ? `\u00a0${unit}` : ""}`;
  if (min !== undefined && max !== undefined) return `entre ${formatNumber(min)} et ${shown(max)}`;
  if (min !== undefined) return `d'au moins ${shown(min)}`;
  if (max !== undefined) return `d'au plus ${shown(max)}`;
  return null;
}

/** The value typed, or the reason it is refused, telling what is expected. */
export function parse(edit: InlineEdit, draft: string): { value: string | number | null } | { error: string } {
  const text = draft.trim();
  if (!text) return { value: null };
  if (edit.kind === "number") {
    const bounds = numberBounds(edit);
    const number = Number(text.replace(",", "."));
    if (!Number.isFinite(number)) return { error: bounds ? `Saisir un nombre ${bounds}.` : "Saisir un nombre, par exemple 12 ou 3,5." };
    if ((edit.min !== undefined && number < edit.min) || (edit.max !== undefined && number > edit.max)) return { error: `Le nombre doit être ${bounds}.` };
    return { value: number };
  }
  if (edit.kind === "email" || edit.kind === "url") {
    const refused = checkField({ type: edit.kind }, text);
    return refused ? { error: refused } : { value: text };
  }
  if (edit.kind === "markdown") return { value: draft.trim() ? draft : null };
  if (edit.kind === "date") {
    // The browser lets years of six digits through.
    const date = new Date(text);
    if (Number.isNaN(date.getTime()) || date.getFullYear() > 9999) return { error: "Date incomplète : jour, mois et année attendus." };
    // Bounds of a day, compared as typed: `YYYY-MM-DD` first.
    if (edit.min && text.slice(0, 10) < edit.min.slice(0, 10)) return { error: `La date doit être le ${formatDate(edit.min)} ou après.` };
    if (edit.max && text.slice(0, 10) > edit.max.slice(0, 10)) return { error: `La date doit être le ${formatDate(edit.max)} ou avant.` };
    if (edit.time) return { value: date.toISOString() };
  }
  return { value: text };
}
