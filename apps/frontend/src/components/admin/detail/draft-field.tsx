"use client";

import { ChevronDownIcon, EyeIcon, LockIcon, PencilIcon } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SWITCH_ON } from "./field-buttons";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type DetailFieldEdit, type DraftBinding, type InlineEdit, isInline, isMultiline, type PickerEdit } from "./edit-types";
import { EditValue } from "./edit-value";
import { draftOf, editEmpty, parse } from "./field-edit";
import { Markdown } from "./markdown";
import { MarkdownToolbar, markdownShortcut } from "./markdown-toolbar";
import { PickerField } from "./field-picker";
import { usePreview } from "./use-preview";

/*
 * A field of a draft (`draft.tsx`): always open, no pencil, its value held
 * by the draft until it is submitted as a whole.
 */

/** As tall as a finger on a phone, in the size of the text around (the back office keeps the browser from zooming on them: its `viewport`). */
const FIELD = "h-9 text-sm md:h-8";

type Bound<E extends DetailFieldEdit> = E & { draft: DraftBinding };

/** The field of `edit`, its error under it. */
export function DraftValue({ edit, label }: { edit: Bound<DetailFieldEdit>; label: string }) {
  const { error } = edit.draft;
  // Not for this user: its value, and why.
  if (edit.locked)
    return (
      <div className="flex w-full min-w-0 flex-col gap-0.5 py-1">
        <span className="flex min-h-8 min-w-0 items-center gap-2 text-muted-foreground">
          <LockIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">{editEmpty(edit) ? "—" : <EditValue edit={{ ...edit, draft: undefined } as DetailFieldEdit} />}</span>
        </span>
        <span className="text-xs text-muted-foreground">{edit.locked}</span>
      </div>
    );
  return (
    // Counted by the draft on submitting.
    <div data-draft-invalid={edit.draft.invalid || undefined} className="flex w-full min-w-0 flex-col gap-1 py-1">
      {isInline(edit) ? (
        <DraftInline edit={edit as Bound<InlineEdit>} label={label} />
      ) : edit.kind === "switch" ? (
        <span className="flex h-8 items-center gap-2">
          <Switch checked={edit.value} disabled={edit.draft.disabled} onCheckedChange={(next) => void edit.onSave(next)} aria-label={label} className={SWITCH_ON} />
          <span className="text-muted-foreground">{edit.value ? "Oui" : "Non"}</span>
        </span>
      ) : (
        <DraftPicker edit={edit as Bound<PickerEdit>} label={label} />
      )}
      {error && (
        <p data-draft-error className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * A text, a number or a date typed: the value goes to the draft as it is
 * typed; a text that is no value yet (a number half typed) is told on leaving
 * the field. Enter submits the draft, ⌘ Enter on several lines.
 */
function DraftInline({ edit, label }: { edit: Bound<InlineEdit>; label: string }) {
  const [text, setText] = useState(() => draftOf(edit));
  // Set by another field (e.g. a default following a choice): the text follows.
  const [seen, setSeen] = useState(edit.value);
  if (edit.value !== seen) {
    setSeen(edit.value);
    const typed = parse(edit, text);
    if (!("value" in typed) || typed.value !== edit.value) setText(draftOf(edit));
  }
  const multiline = isMultiline(edit);
  const [preview, setPreview] = useState(false);
  const [textarea, setTextarea] = useState<HTMLTextAreaElement | null>(null);
  const field = {
    value: text,
    disabled: edit.draft.disabled,
    "aria-label": label,
    "aria-invalid": !!edit.draft.error || undefined,
    "aria-required": edit.draft.required || undefined,
    onChange: (event: { target: { value: string } }) => {
      setText(event.target.value);
      const typed = parse(edit, event.target.value);
      if ("error" in typed) return edit.draft.onTyped(typed.error);
      edit.draft.onTyped(null);
      setSeen(typed.value as never);
      void (edit.onSave as (value: unknown) => unknown)(typed.value);
    },
    onBlur: edit.draft.onLeave,
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  if (edit.kind === "markdown")
    return (
      <div className="flex flex-col gap-1">
        {/* Its shaping buttons, and the text drawn as it will show. */}
        <MarkdownToolbar
          field={preview ? null : textarea}
          onChange={(next) => field.onChange({ target: { value: next } })}
          disabled={edit.draft.disabled || preview}
          aside={
            <button type="button" onClick={() => setPreview((shown) => !shown)} className="inline-flex h-6 items-center gap-1 rounded-md border bg-background px-1.5 text-xs text-muted-foreground shadow-xs hover:text-foreground [&_svg]:size-3.5">
              {preview ? <PencilIcon aria-hidden /> : <EyeIcon aria-hidden />}
              {preview ? "Modifier" : "Aperçu"}
            </button>
          }
        />
        {preview ? (
          <div className="min-h-20 rounded-lg border px-2.5 py-1 text-sm">{text.trim() ? <Markdown source={text} /> : <span className="text-muted-foreground">Rien à afficher</span>}</div>
        ) : (
          <Textarea
            {...field}
            ref={setTextarea}
            onKeyDown={(event) => markdownShortcut(event, (next) => field.onChange({ target: { value: next } })) || onKeyDown(event)}
            placeholder={edit.placeholder}
            className="min-h-28 text-sm"
          />
        )}
      </div>
    );
  if (multiline) return <Textarea {...field} onKeyDown={onKeyDown} placeholder={"placeholder" in edit ? edit.placeholder : undefined} className="min-h-20 text-sm" />;
  if (edit.kind === "number")
    return (
      <div className="relative">
        <Input {...field} type="number" inputMode="decimal" min={edit.min} max={edit.max} step={edit.step ?? "any"} className={cn(FIELD, edit.unit && "pr-14", "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none")} />
        {edit.unit && <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">{edit.unit}</span>}
      </div>
    );
  if (edit.kind === "date") return <Input {...field} type={edit.time ? "datetime-local" : "date"} min={edit.min} max={edit.max} className={FIELD} />;
  if (edit.kind === "email" || edit.kind === "url") return <Input {...field} type={edit.kind} inputMode={edit.kind} autoComplete="off" placeholder={edit.placeholder} className={FIELD} />;
  return <Input {...field} placeholder={edit.placeholder} className={FIELD} />;
}

/** A value picked in the popover of its kind, from a box in the look of a field; a pick goes to the draft. */
function DraftPicker({ edit, label }: { edit: Bound<PickerEdit>; label: string }) {
  const [open, setOpen] = useState(false);
  const empty = edit.kind === "image" ? edit.draft.raw === null : editEmpty(edit);
  return (
    <PickerField
      edit={edit}
      label={label}
      editing={open}
      onEditing={(next) => {
        setOpen(next);
        if (!next) edit.draft.onLeave();
      }}
    >
      <button
        type="button"
        disabled={edit.draft.disabled}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={!!edit.draft.error || undefined}
        aria-required={edit.draft.required || undefined}
        // Open, the focus kept in the popover (a search): leaving it would close the popover, the click then opening it again.
        onMouseDown={(event) => open && event.preventDefault()}
        onClick={() => setOpen((shown) => !shown)}
        className={cn(
          "flex min-h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:min-h-8 dark:bg-input/30",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          open && "border-ring ring-3 ring-ring/50",
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {empty ? <span className="text-muted-foreground">{edit.kind === "multiselect" ? "Choisir…" : "Choisir"}</span> : edit.kind === "image" ? <DraftImage raw={edit.draft.raw as string | File} /> : <EditValue edit={edit} />}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </PickerField>
  );
}

/** The image held: its URL, or the file picked. */
function DraftImage({ raw }: { raw: string | File }) {
  const src = usePreview(raw);
  return (
    <span className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- an object URL */}
      <img src={src ?? undefined} alt="" className="my-1 h-8 max-w-20 rounded-sm object-cover ring-1 ring-foreground/10" />
      <span className="truncate text-muted-foreground">{raw instanceof File ? raw.name : "Image actuelle"}</span>
    </span>
  );
}
