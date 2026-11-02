import type { ReactNode } from "react";
import type { ActionResult } from "@/components/admin/action-state";
import type { Tone } from "@/components/admin/data-table";

/*
 * The kinds of values a `DetailField` edits in place: typed in its field
 * (text, number, date), picked in a popover (list, colour, icon, image), or
 * switched at once.
 */

export type Save<T> = (value: T) => Promise<ActionResult | void>;

/** An option of a list: its label, an icon before it, or a `tone` drawing it as a pill. */
export interface DetailEditOption {
  value: string;
  label: string;
  icon?: ReactNode;
  tone?: Tone;
  /** Under its label in a list, e.g. the @username of an account. */
  description?: string;
  /** A page of the back office it leads to once picked, e.g. its row in another table (`?row=`): a link in the value shown. */
  href?: string;
}

/**
 * Bound to a draft by `form.bind` (`draft.tsx`): typed in a field always
 * open while `active`, else shown without its pencil. Not for pages.
 */
export interface DraftBinding {
  active: boolean;
  /** Refused as it stands, told or not yet. */
  invalid: boolean;
  /** Shown under the field. */
  error: string | null;
  required: boolean;
  disabled: boolean;
  /** The value held, a `File` picked for an image. */
  raw: unknown;
  /** A text that is no value yet, e.g. a number half typed: its reason, null once it is. */
  onTyped: (error: string | null) => void;
  /** The field left: its error shown from then on. */
  onLeave: () => void;
}

/**
 * Saves a value; `validate` refuses it first, its reason in a bubble above
 * the field, e.g. a date before another field of the row. `required` refuses
 * it cleared, « Champ obligatoire. ».
 */
type Saved<T> = {
  onSave: Save<T>;
  validate?: (value: T) => string | null;
  required?: boolean;
  /**
   * Not editable by this user, and why, e.g. « Réservé aux super-admins »: a
   * lock instead of its pencil, its reason in a bubble; no blue dot.
   */
  locked?: string | null;
  draft?: DraftBinding;
};

/** The kinds of in-place edits, by their `kind`; `text` when none. */
export interface DetailEditKinds {
  /** A text; on several lines with `multiline`, ⌘ Enter then saving. */
  text: { kind?: "text"; value: string | null; multiline?: boolean; placeholder?: string } & Saved<string | null>;
  /** A number between `min` and `max`, `unit` after it. */
  number: { kind: "number"; value: number | null; min?: number; max?: number; step?: number; unit?: string } & Saved<number | null>;
  /** A day, `YYYY-MM-DD`; with `time`, an ISO instant, typed in the time zone of the browser. */
  date: { kind: "date"; value: string | null; time?: boolean; min?: string; max?: string } & Saved<string | null>;
  /** One option of a list; `noneLabel` names the choice of none. */
  select: { kind: "select"; value: string | null; options: DetailEditOption[]; noneLabel?: string } & Saved<string | null>;
  /** Several options of a list, in their order, saved as the popover closes. */
  multiselect: { kind: "multiselect"; value: string[]; options: DetailEditOption[] } & Saved<string[]>;
  /** A colour `#rrggbb`: one of `presets`, or any hue, saved by « Valider ». */
  color: { kind: "color"; value: string | null; presets?: string[]; noneLabel?: string } & Saved<string | null>;
  /** The name of a Lucide icon, e.g. `rocket`, among all of them. */
  icon: { kind: "icon"; value: string | null; noneLabel?: string } & Saved<string | null>;
  /**
   * An image, shown by its URL `value`, replaced by a file of `accept` up to
   * `maxSize` bytes (both told in the title of the popover), saved by
   * « Valider »; `noneLabel` removes it, `onSave` then given `null`.
   */
  image: { kind: "image"; value: string | null; accept?: string; maxSize?: number; noneLabel?: string } & Saved<File | null>;
  /** Yes or no, saved as soon as switched. */
  switch: { kind: "switch"; value: boolean } & Saved<boolean>;
  /** An e-mail address, refused malformed; shown as a link. */
  email: { kind: "email"; value: string | null; placeholder?: string } & Saved<string | null>;
  /** An `http` or `https` link, refused malformed; shown as a link. */
  url: { kind: "url"; value: string | null; placeholder?: string } & Saved<string | null>;
  /** A text in Markdown, typed on several lines (an eye shows it drawn), shown drawn. */
  markdown: { kind: "markdown"; value: string | null; placeholder?: string } & Saved<string | null>;
  /**
   * Free values, typed one by one (Enter or a comma adds one), `suggestions`
   * offered as they are typed; saved as the popover closes.
   */
  tags: { kind: "tags"; value: string[]; suggestions?: string[]; max?: number; maxLength?: number; placeholder?: string } & Saved<string[]>;
  /**
   * Another row, e.g. an account: searched on the server by `search(query)`
   * (an empty query for the first ones), picked in a popover; a click saves.
   * The value is the option, so that its label shows without loading it.
   */
  relation: { kind: "relation"; value: DetailEditOption | null; search: (query: string) => Promise<DetailEditOption[]>; noneLabel?: string; placeholder?: string } & Saved<DetailEditOption | null>;
}
export type DetailEditKind = keyof DetailEditKinds;

/**
 * What a field edits in place; see `DetailField`. `onSave` resolves once
 * saved; `{ ok: false }` keeps the field open, its message in a bubble above it.
 */
export type DetailFieldEdit<K extends DetailEditKind = DetailEditKind> = DetailEditKinds[K];

/** Kinds typed in the field itself. */
export type InlineEdit = Extract<DetailFieldEdit, { kind?: "text" | "number" | "date" | "email" | "url" | "markdown" }>;
/** Kinds picked in a popover. */
export type PickerEdit = Extract<DetailFieldEdit, { kind: "select" | "multiselect" | "color" | "icon" | "image" | "tags" | "relation" }>;

const INLINE = new Set([undefined, "text", "number", "date", "email", "url", "markdown"]);
export const isInline = (edit: DetailFieldEdit): edit is InlineEdit => INLINE.has(edit.kind);
/** Typed on several lines: ⌘ Enter saves. */
export const isMultiline = (edit: DetailFieldEdit) => edit.kind === "markdown" || ((!edit.kind || edit.kind === "text") && !!edit.multiline);
