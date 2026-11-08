"use client";

import { CheckIcon, EyeIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { Input } from "@kilotrace/ui/components/ui/input";
import { Textarea } from "@kilotrace/ui/components/ui/textarea";
import { cn } from "@kilotrace/ui/lib/utils";
import { type InlineEdit, isMultiline } from "./edit-types";
import { ErrorBubble } from "./error-bubble";
import { DetailFieldButton, FieldButtons } from "./field-buttons";
import { draftOf, parse, useCommit } from "./field-edit";
import { Markdown } from "@kilotrace/ui/components/markdown/markdown";
import { MarkdownToolbar, markdownShortcut } from "./markdown-toolbar";

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
          <MarkdownToolbar field={preview ? null : (anchor as HTMLTextAreaElement | null)} onChange={type} disabled={saving || preview} highlight={edit.highlight} className="mt-1 mr-22" />
          {preview ? (
            <div className="min-h-20 rounded-lg border px-2.5 py-1 text-sm">{draft.trim() ? <Markdown source={draft} highlight={edit.highlight} /> : <span className="text-muted-foreground">Rien à afficher</span>}</div>
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
