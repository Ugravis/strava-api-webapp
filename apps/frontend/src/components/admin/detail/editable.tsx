"use client";

import { PencilIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { CopyButton, EmptyValue } from "@/components/admin/data-table/cells/base";
import { cn } from "@/lib/utils";
import { DetailFieldButton, FieldButtons } from "./field-buttons";
import { type DetailFieldEdit, EditValue, editCopy, editEmpty, InlineEditor, isInline } from "./field-edit";
import { PickerField } from "./field-picker";

/*
 * A value, its buttons floating at its right, and its in-place edit: the
 * inside of a field of a detail, or of a cell of a table. The box around it
 * (`group/cell relative`) is the caller's.
 */

/**
 * `edit` edits the value in place, from its pencil only: a field (text,
 * number, date) or a popover (list, colour, icon, image), the pencil then
 * closing it again; a switch saves as soon as switched. `copy` is the text
 * copied, a text or a number shown being copied as is. `docked`: on a screen
 * without hover, the buttons sit after the value, always shown (a detail);
 * else they float over it on hover (a cell).
 */
export function EditableValue({
  label,
  copy,
  tools,
  edit,
  stacked,
  docked,
  valueClassName,
  children,
}: {
  label: string;
  copy?: string | null;
  tools?: ReactNode;
  edit?: DetailFieldEdit;
  stacked?: boolean;
  docked?: boolean;
  valueClassName?: string;
  children?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const inline = !!edit && isInline(edit);
  const multiline = inline && (!edit.kind || edit.kind === "text") && !!edit.multiline;
  // Without children, the value of `edit` drawn after its kind.
  const drawn = children === undefined || children === null ? undefined : children;
  const empty = drawn === undefined ? !edit || editEmpty(edit) : drawn === "" || drawn === false;
  const copied = copy !== undefined ? copy : drawn === undefined ? (edit ? editCopy(edit) : null) : typeof drawn === "string" || typeof drawn === "number" ? String(drawn) : null;
  // A switch is its own button: no pencil.
  const editable = !!edit && edit.kind !== "switch";
  // A popover open, the pencil closes it again, giving up.
  const toggle = () => editable && setEditing((open) => !open);

  const value = drawn === undefined && edit ? <EditValue edit={edit} /> : empty ? <EmptyValue /> : drawn;
  const valueClass = cn("min-w-0 flex-1", valueClassName, inline && drawn === undefined && (multiline ? "whitespace-pre-line" : "truncate"));
  const buttons = (tools || copied || editable) && (
    <>
      {tools}
      {copied && <CopyButton value={copied} inline />}
      {editable && (
        <DetailFieldButton label={editing ? `Annuler : ${label}` : `Modifier : ${label}`} pressed={editing} onClick={toggle}>
          <PencilIcon />
        </DetailFieldButton>
      )}
    </>
  );

  if (edit && editing && isInline(edit)) return <InlineEditor edit={edit} label={label} onClose={() => setEditing(false)} />;
  return (
    <>
      {edit && !isInline(edit) && edit.kind !== "switch" ? (
        <PickerField edit={edit} label={label} editing={editing} onEditing={setEditing} className={valueClass}>
          {value}
        </PickerField>
      ) : (
        <div className={valueClass}>{value}</div>
      )}
      {buttons && (
        <FieldButtons top={stacked} shown={editing} docked={docked}>
          {buttons}
        </FieldButtons>
      )}
    </>
  );
}

/** Tells a field editable: a pencil at the top right of its label. */
export function EditableMark() {
  return (
    <span title="Modifiable" className="-ml-0.5 inline-flex shrink-0 -translate-y-1 text-primary [&_svg]:size-2.5">
      <PencilIcon aria-hidden strokeWidth={2.5} />
      <span className="sr-only">Modifiable</span>
    </span>
  );
}
