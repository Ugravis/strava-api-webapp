"use client";

import { CheckIcon, LoaderCircleIcon, PencilIcon, XIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useState } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/components/admin/action-state";
import { CopyButton, EmptyValue, FLOATING_BUTTON } from "@/components/admin/data-table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/*
 * The content of a detail: in the split panel, a dialog or a page alike.
 * Values are drawn by the cells of the table kit, so that a field looks the
 * same in the list and in its detail.
 */

/** Labels and values side by side; labels of one width, so that several lists of a section line up. */
export function DetailFields({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 text-sm">{children}</dl>;
}

/** What a field edits in place; see `DetailField`. */
export interface DetailFieldEdit {
  value: string | null;
  /** Resolves once saved; `{ ok: false }` keeps the field open, its message in a toast. */
  onSave: (value: string | null) => Promise<ActionResult | void>;
  /** On several lines: ⌘ Enter saves. */
  multiline?: boolean;
  placeholder?: string;
}

/**
 * A button floating at the right of a field on hover, beside copy and edit,
 * named in a bubble: the `tools` of a `DetailField`.
 */
export function DetailFieldButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        delay={400}
        render={
          <button
            type="button"
            aria-label={label}
            disabled={disabled}
            // Pressed before a field being edited loses its focus, which would save.
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            className={FLOATING_BUTTON}
          >
            {children}
          </button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * A label and its value, « — » when it has none. On hover, buttons float at
 * the right of the value, in the look of the copy button of the tables:
 * `tools` (any `DetailFieldButton`), copy (`copy`), edit (`edit`). `stacked`
 * sets the value under its label across the whole width, a long text, the
 * buttons then at the top right of the panel. The value may be `DetailItems`,
 * one line per value.
 *
 * `edit` edits it in place: a click on the value, or the pencil, opens a
 * field; Enter (⌘ Enter on several lines), ✓ or leaving the field saves; Esc
 * or ✕ gives up, the panel staying open. Nothing is ever left unsaved, so
 * nothing guards the closing of the panel. Without children, the value shows
 * `edit.value`.
 */
export function DetailField({
  label,
  icon,
  copy,
  stacked,
  tools,
  edit,
  children,
}: {
  label: string;
  icon?: ReactNode;
  copy?: string | null;
  stacked?: boolean;
  tools?: ReactNode;
  edit?: DetailFieldEdit;
  children?: ReactNode;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = !!edit && draft !== null;
  const multiline = !!edit?.multiline;
  const value = children ?? (edit ? edit.value : undefined);
  const empty = value === null || value === undefined || value === "" || value === false;
  const start = () => edit && setDraft(edit.value ?? "");

  const save = async () => {
    if (!edit || draft === null || saving) return;
    const next = draft.trim() || null;
    if (next === edit.value) return setDraft(null);
    setSaving(true);
    try {
      const outcome = await edit.onSave(next);
      if (outcome && !outcome.ok) toast.error(outcome.message);
      else setDraft(null);
    } catch {
      toast.error("La modification n'a pas pu être enregistrée.");
    } finally {
      setSaving(false);
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      // Left to the field: the panel stays open.
      event.preventDefault();
      setDraft(null);
    } else if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void save();
    }
  };

  const buttons = editing ? (
    <>
      <DetailFieldButton label="Enregistrer" disabled={saving} onClick={() => void save()}>
        {saving ? <LoaderCircleIcon className="animate-spin" /> : <CheckIcon />}
      </DetailFieldButton>
      <DetailFieldButton label="Annuler" disabled={saving} onClick={() => setDraft(null)}>
        <XIcon />
      </DetailFieldButton>
    </>
  ) : (
    (tools || copy || edit) && (
      <>
        {tools}
        {copy && <CopyButton value={copy} inline />}
        {edit && (
          <DetailFieldButton label={`Modifier : ${label}`} onClick={start}>
            <PencilIcon />
          </DetailFieldButton>
        )}
      </>
    )
  );
  const field = {
    autoFocus: true,
    value: draft ?? "",
    disabled: saving,
    placeholder: edit?.placeholder,
    "aria-label": label,
    onChange: (event: { target: { value: string } }) => setDraft(event.target.value),
    onKeyDown,
    onBlur: () => void save(),
  };

  return (
    <div className="contents">
      <dt className={cn("flex min-h-8 items-center gap-1.5 self-start text-muted-foreground", stacked && "col-span-2")}>
        {icon && <span className="inline-flex shrink-0 text-muted-foreground/70 [&_svg]:size-3.5">{icon}</span>}
        {label}
      </dt>
      <dd
        className={cn(
          "group/cell relative flex min-h-8 min-w-0 items-center",
          // Its text wraps, cut nowhere.
          stacked && "col-span-2 mb-2 [&_.truncate]:whitespace-normal",
        )}
      >
        {editing ? (
          multiline ? (
            <Textarea {...field} className="min-h-20 pr-16 text-sm" />
          ) : (
            <Input {...field} className="h-7 pr-16 text-sm" />
          )
        ) : (
          // As wide as the panel: the widths of the table columns let go.
          <div
            onClick={edit && start}
            className={cn(
              "min-w-0 flex-1 wrap-break-word **:[[class*='max-w-']]:max-w-full",
              edit && "cursor-text",
              edit && !children && (multiline ? "whitespace-pre-line" : "truncate"),
            )}
          >
            {empty ? <EmptyValue /> : value}
          </div>
        )}
        {buttons && (
          <span
            className={cn(
              "absolute right-1.5 z-10 flex items-center gap-1",
              // At the top of a long text or a field of several lines, else centred.
              stacked || editing && multiline ? "top-1" : "top-1/2 -translate-y-1/2",
              !editing && "opacity-0 transition-opacity group-hover/cell:opacity-100 has-focus-visible:opacity-100",
            )}
          >
            {buttons}
          </span>
        )}
      </dd>
    </div>
  );
}
