"use client";

import { checkField, type FieldRule } from "@kilotrace/shared/rules";
import { CheckIcon, EyeIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useState } from "react";
import type { ActionResult } from "@/components/admin/action-state";
import { DateCell, EmptyValue, formatDate, formatDateTime, NumberCell, PILL_TONES, Tip, type Tone } from "@/components/admin/data-table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ErrorBubble } from "./error-bubble";
import { DetailFieldButton, FieldButtons } from "./field-buttons";
import { LucideIconByName } from "./icon-picker";
import { Markdown } from "./markdown";
import { MarkdownToolbar, markdownShortcut } from "./markdown-toolbar";

/*
 * The kinds of values a `DetailField` edits in place: typed in its field
 * (text, number, date), picked in a popover (list, colour, icon, image), or
 * switched at once.
 */

type Save<T> = (value: T) => Promise<ActionResult | void>;

/** An option of a list: its label, an icon before it, or a `tone` drawing it as a pill. */
export interface DetailEditOption {
  value: string;
  label: string;
  icon?: ReactNode;
  tone?: Tone;
  /** Under its label in a list, e.g. the @username of an account. */
  description?: string;
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
    if (!(next instanceof File) && JSON.stringify(next) === JSON.stringify(edit.value)) return close();
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

/** An option as a list shows it: a pill of its tone, or its icon and label. */
export function OptionLabel({ option }: { option: DetailEditOption }) {
  if (option.tone) return <span className={cn("inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium", PILL_TONES[option.tone])}>{option.label}</span>;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {option.icon && <span className="inline-flex shrink-0 text-muted-foreground [&_svg]:size-3.5">{option.icon}</span>}
      <span className="truncate">{option.label}</span>
      {option.description && <span className="truncate text-xs text-muted-foreground">{option.description}</span>}
    </span>
  );
}

/** A colour as a field shows it: its swatch and its code. */
export function ColorValue({ color }: { color: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="size-4 shrink-0 rounded-full ring-1 ring-foreground/10" style={{ backgroundColor: color }} aria-hidden />
      <code className="font-mono text-xs">{color}</code>
    </span>
  );
}

/** The value of a field without children, drawn after its kind. */
export function EditValue({ edit }: { edit: DetailFieldEdit }) {
  // Bound to a draft at rest: told, not switched.
  if (edit.kind === "switch") return edit.draft ? <span className="text-muted-foreground">{edit.value ? "Oui" : "Non"}</span> : <SwitchValue edit={edit} />;
  if (editEmpty(edit)) return <EmptyValue />;
  switch (edit.kind) {
    case "number":
      return <NumberCell value={edit.value} zero unit={edit.unit} />;
    case "date":
      return <DateCell iso={edit.value} time={edit.time} />;
    case "select": {
      const option = edit.options.find((each) => each.value === edit.value);
      return option ? <OptionLabel option={option} /> : edit.value;
    }
    case "multiselect":
      return (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
          {edit.value.map((value) => {
            const option = edit.options.find((each) => each.value === value);
            return option ? <OptionLabel key={value} option={option} /> : <span key={value}>{value}</span>;
          })}
        </span>
      );
    case "color":
      return <ColorValue color={edit.value!} />;
    case "email":
    case "url":
      return (
        <a
          href={edit.kind === "email" ? `mailto:${edit.value}` : edit.value!}
          target="_blank"
          rel="noreferrer"
          // Kept from the row of a table.
          onClick={(event) => event.stopPropagation()}
          className="truncate underline-offset-2 hover:underline"
        >
          {edit.value}
        </a>
      );
    case "markdown":
      return <Markdown source={edit.value!} />;
    case "tags":
      return (
        <span className="flex flex-wrap items-center gap-1 py-1">
          {edit.value.map((tag) => (
            <span key={tag} className={cn("inline-flex h-5 items-center rounded-full px-2 text-xs font-medium", PILL_TONES.gray)}>
              {tag}
            </span>
          ))}
        </span>
      );
    case "relation":
      return <OptionLabel option={edit.value!} />;
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element -- any URL, an object URL included
        <img src={edit.value!} alt="" className="my-1 h-10 max-w-24 rounded-sm object-cover ring-1 ring-foreground/10" />
      );
    case "icon":
      return (
        <span className="flex items-center gap-2">
          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted [&_svg]:size-3.5">
            <LucideIconByName name={edit.value!} />
          </span>
          <code className="truncate font-mono text-xs">{edit.value}</code>
        </span>
      );
    default:
      return edit.value;
  }
}

/** A switch saving as soon as switched, « Oui » or « Non » beside it. */
function SwitchValue({ edit }: { edit: Extract<DetailFieldEdit, { kind: "switch" }> }) {
  const { saving, commit, error } = useCommit(edit, () => {});
  const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);
  return (
    <span ref={setAnchor} className="flex items-center gap-2">
      <ErrorBubble anchor={anchor} message={error} />
      {edit.locked ? (
        <Tip label={edit.locked}>
          <span tabIndex={0} className="inline-flex cursor-not-allowed">
            <Switch checked={edit.value} disabled aria-label={edit.locked} />
          </span>
        </Tip>
      ) : (
        <Switch checked={edit.value} disabled={saving} onCheckedChange={(next) => void commit(next)} aria-label={edit.value ? "Oui" : "Non"} />
      )}
      <span className="text-muted-foreground">{edit.value ? "Oui" : "Non"}</span>
      {saving && <LoaderCircleIcon className="size-3.5 animate-spin text-muted-foreground" aria-hidden />}
    </span>
  );
}

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
  const shown = (value: number) => `${value.toLocaleString("fr-FR")}${unit ? `\u00a0${unit}` : ""}`;
  if (min !== undefined && max !== undefined) return `entre ${min.toLocaleString("fr-FR")} et ${shown(max)}`;
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

/**
 * The field typing a text, a number or a date, and its ✓ and ✕: Enter (⌘
 * Enter on several lines), ✓ or leaving the field saves; Esc or ✕ gives up.
 */
export function InlineEditor({ edit, label, onClose }: { edit: InlineEdit; label: string; onClose: () => void }) {
  const [draft, setDraft] = useState(() => draftOf(edit));
  const { saving, commit, error, setError } = useCommit(edit, onClose);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const multiline = isMultiline(edit);
  // Markdown drawn as it will show, the field hidden meanwhile.
  const [preview, setPreview] = useState(false);

  const save = () => {
    if (saving) return;
    const parsed = parse(edit, draft);
    if ("error" in parsed) setError(parsed.error);
    else void commit(parsed.value);
  };
  const type = (text: string) => {
    setDraft(text);
    setError(null);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (edit.kind === "markdown" && markdownShortcut(event as KeyboardEvent<HTMLTextAreaElement>, type)) return;
    if (event.key === "Escape") {
      // Left to the field: the panel stays open.
      event.preventDefault();
      onClose();
    } else if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      save();
    }
  };
  const field = {
    ref: setAnchor,
    autoFocus: true,
    value: draft,
    disabled: saving,
    "aria-label": label,
    "aria-invalid": !!error || undefined,
    onChange: (event: { target: { value: string } }) => {
      setDraft(event.target.value);
      setError(null);
    },
    onKeyDown,
    onBlur: save,
  };

  // The field and its buttons in one box: the buttons stay inside its frame, in a cell as in a detail.
  // The field fills the box but gives it no width: a cell of a table keeps its own, the box its minimum.
  return (
    <div className={cn("relative w-full", multiline ? "min-w-0" : edit.kind === "date" ? "min-w-44" : "min-w-32")}>
      <ErrorBubble anchor={anchor} message={error} />
      {edit.kind === "markdown" ? (
        // Its shaping buttons above it, beside the ✓ and ✕ of the field.
        <div className="flex flex-col gap-1">
          <MarkdownToolbar field={preview ? null : (anchor as HTMLTextAreaElement | null)} onChange={type} disabled={saving || preview} className="min-h-7 pr-24" />
          {preview ? (
            <div className="min-h-20 rounded-lg border px-2.5 py-1 text-sm">{draft.trim() ? <Markdown source={draft} /> : <span className="text-muted-foreground">Rien à afficher</span>}</div>
          ) : (
            <Textarea {...field} placeholder={edit.placeholder} className="min-h-24 text-sm" />
          )}
        </div>
      ) : multiline ? (
        <Textarea {...field} placeholder={"placeholder" in edit ? edit.placeholder : undefined} className="min-h-20 pr-16 text-sm" />
      ) : edit.kind === "number" ? (
        <Input {...field} type="number" inputMode="decimal" min={edit.min} max={edit.max} step={edit.step ?? "any"} className="h-7 w-0 min-w-full [appearance:textfield] pr-15 text-sm [&::-webkit-inner-spin-button]:appearance-none" />
      ) : edit.kind === "date" ? (
        <Input {...field} type={edit.time ? "datetime-local" : "date"} min={edit.min} max={edit.max} className="h-7 w-0 min-w-full pr-15 text-sm" />
      ) : (
        <Input
          {...field}
          type={edit.kind === "email" || edit.kind === "url" ? edit.kind : "text"}
          inputMode={edit.kind === "email" || edit.kind === "url" ? edit.kind : undefined}
          placeholder={edit.placeholder}
          className="h-7 w-0 min-w-full pr-15 text-sm"
        />
      )}
      <FieldButtons top={multiline} shown>
        {edit.kind === "markdown" && (
          <DetailFieldButton label={preview ? "Modifier le texte" : "Aperçu"} pressed={preview} disabled={saving} onClick={() => setPreview((shown) => !shown)}>
            <EyeIcon />
          </DetailFieldButton>
        )}
        <DetailFieldButton label="Enregistrer" primary disabled={saving} onClick={save}>
          {saving ? <LoaderCircleIcon className="animate-spin" /> : <CheckIcon />}
        </DetailFieldButton>
        <DetailFieldButton label="Annuler" disabled={saving} onClick={onClose}>
          <XIcon />
        </DetailFieldButton>
      </FieldButtons>
    </div>
  );
}
