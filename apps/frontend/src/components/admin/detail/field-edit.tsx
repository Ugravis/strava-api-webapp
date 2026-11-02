"use client";

import { CheckIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useState } from "react";
import type { ActionResult } from "@/components/admin/action-state";
import { DateCell, EmptyValue, formatDate, formatDateTime, NumberCell, PILL_TONES, type Tone } from "@/components/admin/data-table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ErrorBubble } from "./error-bubble";
import { DetailFieldButton, FieldButtons } from "./field-buttons";
import { LucideIconByName } from "./icon-picker";

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
}

/**
 * Saves a value; `validate` refuses it first, its reason in a bubble above
 * the field, e.g. a date before another field of the row.
 */
type Saved<T> = { onSave: Save<T>; validate?: (value: T) => string | null };

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
}
export type DetailEditKind = keyof DetailEditKinds;

/**
 * What a field edits in place; see `DetailField`. `onSave` resolves once
 * saved; `{ ok: false }` keeps the field open, its message in a bubble above it.
 */
export type DetailFieldEdit<K extends DetailEditKind = DetailEditKind> = DetailEditKinds[K];

/** Kinds typed in the field itself. */
export type InlineEdit = Extract<DetailFieldEdit, { kind?: "text" | "number" | "date" }>;
/** Kinds picked in a popover. */
export type PickerEdit = Extract<DetailFieldEdit, { kind: "select" | "multiselect" | "color" | "icon" | "image" }>;

export const isInline = (edit: DetailFieldEdit): edit is InlineEdit => !edit.kind || edit.kind === "text" || edit.kind === "number" || edit.kind === "date";

/**
 * Saves a value, unless unchanged, then calls `close`. Refused by `validate`
 * or by the server, it stays open, the reason in `error` (a bubble above the
 * field), until `setError(null)` as the value changes.
 */
export function useCommit(edit: DetailFieldEdit, close: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const commit = async (next: unknown) => {
    if (saving) return;
    // A file is always new.
    if (!(next instanceof File) && JSON.stringify(next) === JSON.stringify(edit.value)) return close();
    const refused = (edit.validate as ((value: unknown) => string | null) | undefined)?.(next);
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
    default:
      return edit.value || null;
  }
}

/** Is there anything to show: « — » otherwise. */
export const editEmpty = (edit: DetailFieldEdit) => (edit.kind === "multiselect" ? edit.value.length === 0 : edit.kind !== "switch" && (edit.value === null || edit.value === ""));

/** An option as a list shows it: a pill of its tone, or its icon and label. */
export function OptionLabel({ option }: { option: DetailEditOption }) {
  if (option.tone) return <span className={cn("inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium", PILL_TONES[option.tone])}>{option.label}</span>;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {option.icon && <span className="inline-flex shrink-0 text-muted-foreground [&_svg]:size-3.5">{option.icon}</span>}
      <span className="truncate">{option.label}</span>
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
  if (edit.kind === "switch") return <SwitchValue edit={edit} />;
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
      <Switch checked={edit.value} disabled={saving} onCheckedChange={(next) => void commit(next)} aria-label={edit.value ? "Oui" : "Non"} />
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

const draftOf = (edit: InlineEdit) =>
  edit.value === null ? "" : edit.kind === "number" ? String(edit.value) : edit.kind === "date" && edit.time ? toLocal(edit.value) : edit.value;

/** The value typed, or the reason it is refused. */
function parse(edit: InlineEdit, draft: string): { value: string | number | null } | { error: string } {
  const text = draft.trim();
  if (!text) return { value: null };
  if (edit.kind === "number") {
    const number = Number(text.replace(",", "."));
    if (!Number.isFinite(number)) return { error: "Ce n'est pas un nombre." };
    if (edit.min !== undefined && number < edit.min) return { error: `Au moins ${edit.min}.` };
    if (edit.max !== undefined && number > edit.max) return { error: `Au plus ${edit.max}.` };
    return { value: number };
  }
  if (edit.kind === "date") {
    // The browser lets years of six digits through.
    const date = new Date(text);
    if (Number.isNaN(date.getTime()) || date.getFullYear() > 9999) return { error: "Date invalide." };
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
  const multiline = edit.kind !== "number" && edit.kind !== "date" && !!edit.multiline;

  const save = () => {
    if (saving) return;
    const parsed = parse(edit, draft);
    if ("error" in parsed) setError(parsed.error);
    else void commit(parsed.value);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    // As wide as its box, not as its text: a cell of a table keeps its width.
    size: 1,
  };

  return (
    <>
      <ErrorBubble anchor={anchor} message={error} />
      {multiline ? (
        <Textarea {...field} placeholder={edit.placeholder} className="min-h-20 pr-16 text-sm" />
      ) : edit.kind === "number" ? (
        <Input {...field} type="number" inputMode="decimal" min={edit.min} max={edit.max} step={edit.step ?? "any"} className="h-7 min-w-32 [appearance:textfield] pr-16 text-sm [&::-webkit-inner-spin-button]:appearance-none" />
      ) : edit.kind === "date" ? (
        <Input {...field} type={edit.time ? "datetime-local" : "date"} min={edit.min} max={edit.max} className="h-7 min-w-44 pr-16 text-sm" />
      ) : (
        <Input {...field} placeholder={edit.placeholder} className="h-7 min-w-32 pr-16 text-sm" />
      )}
      <FieldButtons top={multiline} shown>
        <DetailFieldButton label="Enregistrer" disabled={saving} onClick={save}>
          {saving ? <LoaderCircleIcon className="animate-spin" /> : <CheckIcon />}
        </DetailFieldButton>
        <DetailFieldButton label="Annuler" disabled={saving} onClick={onClose}>
          <XIcon />
        </DetailFieldButton>
      </FieldButtons>
    </>
  );
}
