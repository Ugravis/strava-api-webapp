"use client";

import { PencilIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { CopyButton, EmptyValue } from "@/components/admin/data-table";
import { cn } from "@/lib/utils";
import { DetailFieldButton, FieldButtons } from "./field-buttons";
import { type DetailEditKind, type DetailFieldEdit, EditValue, editCopy, editEmpty, InlineEditor, isInline } from "./field-edit";
import { PickerField } from "./field-picker";

/*
 * The content of a detail: in the split panel, a dialog or a page alike.
 * Values are drawn by the cells of the table kit, so that a field looks the
 * same in the list and in its detail.
 */

/** Labels and values side by side; labels of one width, so that several lists of a section line up. */
export function DetailFields({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 text-sm">{children}</dl>;
}

/**
 * A label and its value, « — » when it has none. On hover, buttons float at
 * the right of the value, in the look of the copy button of the tables:
 * `tools` (any `DetailFieldButton`), copy, edit (`edit`). A text or a number
 * is copied as shown; `copy` gives the text of any other value, `null` none. `stacked`
 * sets the value under its label across the whole width, a long text, the
 * buttons then at the top right of the panel. The value may be `DetailItems`,
 * one line per value.
 *
 * `edit` edits it in place, after its `kind` (`DetailFieldEdit`): the pencil
 * only, never a click on the value, opens a field (text, number, date) or a
 * popover (list, colour, icon, image); a switch saves as soon as switched.
 * Enter, ✓, leaving the field or closing the popover saves (a colour or an
 * image by « Valider » only); Esc or ✕ gives up, the panel staying open.
 * Nothing is ever left unsaved, so nothing guards the closing of the panel.
 * Without children, the value is drawn after its kind. A small pencil
 * beside the label tells the field editable, unless `editHint={false}`.
 */
export function DetailField<K extends DetailEditKind = "text">({
  label,
  icon,
  copy,
  stacked,
  tools,
  edit: typed,
  editHint = true,
  children,
}: {
  label: string;
  icon?: ReactNode;
  copy?: string | null;
  stacked?: boolean;
  tools?: ReactNode;
  // Generic on its kind, so that the value given to `onSave` is typed, `text` without a kind.
  edit?: DetailFieldEdit<K> & { kind?: K };
  editHint?: boolean;
  children?: ReactNode;
}) {
  const edit: DetailFieldEdit | undefined = typed;
  const [editing, setEditing] = useState(false);
  const inline = !!edit && isInline(edit);
  const multiline = inline && (!edit.kind || edit.kind === "text") && !!edit.multiline;
  // Without children, the value of `edit` drawn after its kind.
  const drawn = children === undefined || children === null ? undefined : children;
  const empty = drawn === undefined ? !edit || editEmpty(edit) : drawn === "" || drawn === false;
  const copied = copy !== undefined ? copy : drawn === undefined ? (edit ? editCopy(edit) : null) : typeof drawn === "string" || typeof drawn === "number" ? String(drawn) : null;
  // A switch is its own button: no pencil.
  const editable = !!edit && edit.kind !== "switch";
  const start = () => editable && setEditing(true);

  const value =
    drawn === undefined && edit ? <EditValue edit={edit} /> : empty ? <EmptyValue /> : drawn;
  // As wide as the panel: the widths of the table columns let go.
  const valueClass = cn(
    "min-w-0 flex-1 wrap-break-word **:[[class*='max-w-']]:max-w-full",
    inline && drawn === undefined && (multiline ? "whitespace-pre-line" : "truncate"),
  );
  const buttons = (tools || copied || editable) && (
    <>
      {tools}
      {copied && <CopyButton value={copied} inline />}
      {editable && (
        <DetailFieldButton label={`Modifier : ${label}`} onClick={start}>
          <PencilIcon />
        </DetailFieldButton>
      )}
    </>
  );

  return (
    <div className="contents">
      <dt className={cn("flex min-h-8 items-center gap-1.5 self-start text-muted-foreground", stacked && "col-span-2")}>
        {icon && <span className="inline-flex shrink-0 text-muted-foreground/70 [&_svg]:size-3.5">{icon}</span>}
        {label}
        {edit && editHint && (
          <span title="Modifiable" className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-2.5">
            <PencilIcon aria-hidden />
            <span className="sr-only">Modifiable</span>
          </span>
        )}
      </dt>
      <dd
        className={cn(
          "group/cell relative flex min-h-8 min-w-0 items-center",
          // Its text wraps, cut nowhere.
          stacked && "col-span-2 mb-2 [&_.truncate]:whitespace-normal",
        )}
      >
        {edit && editing && isInline(edit) ? (
          <InlineEditor edit={edit} label={label} onClose={() => setEditing(false)} />
        ) : (
          <>
            {edit && !isInline(edit) && edit.kind !== "switch" ? (
              <PickerField edit={edit} label={label} editing={editing} onEditing={setEditing} className={valueClass}>
                {value}
              </PickerField>
            ) : (
              <div className={valueClass}>
                {value}
              </div>
            )}
            {buttons && <FieldButtons top={stacked}>{buttons}</FieldButtons>}
          </>
        )}
      </dd>
    </div>
  );
}
