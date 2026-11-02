"use client";

import { CopyCheckIcon, CopyIcon, PanelRightOpenIcon, PencilIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { CopyButton, EmptyValue } from "@/components/admin/data-table/cells/base";
import { Tip } from "@/components/admin/data-table/tip";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { useNoHover } from "@/hooks/use-no-hover";
import { cn } from "@/lib/utils";
import { DetailFieldButton, FieldButtons, FieldMenuClose, FieldMenuItem } from "./field-buttons";
import { type DetailFieldEdit, EditValue, editCopy, editEmpty, InlineEditor, isInline } from "./field-edit";
import { PickerField } from "./field-picker";

/*
 * A value, its buttons, and its in-place edit: the inside of a field of a
 * detail, or of a cell of a table. The box around it (`group/cell relative`)
 * is the caller's.
 */

/**
 * `edit` edits the value in place, from its pencil only: a field (text,
 * number, date) or a popover (list, colour, icon, image), the pencil then
 * closing it again; a switch saves as soon as switched. `copy` is the text
 * copied, a text or a number shown being copied as is.
 *
 * With hover, the buttons float at the right of the value. Without (a
 * phone), none is shown: a tap on the value opens a bubble of its actions,
 * each with its icon and its name, `onOpen` first (the row of a table).
 */
export function EditableValue({
  label,
  copy,
  tools,
  edit,
  stacked,
  onOpen,
  valueClassName,
  children,
}: {
  label: string;
  copy?: string | null;
  tools?: ReactNode;
  edit?: DetailFieldEdit;
  stacked?: boolean;
  onOpen?: () => void;
  valueClassName?: string;
  children?: ReactNode;
}) {
  const noHover = useNoHover();
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

  const drawnValue = drawn === undefined && edit ? <EditValue edit={edit} /> : empty ? <EmptyValue /> : drawn;
  const value =
    noHover && (tools || copied || editable) ? (
      <ActionsBubble label={label} copied={copied} tools={tools} onEdit={editable ? () => setEditing(true) : undefined} onOpen={onOpen}>
        {drawnValue}
      </ActionsBubble>
    ) : (
      drawnValue
    );
  const valueClass = cn("min-w-0 flex-1", valueClassName, inline && drawn === undefined && (multiline ? "whitespace-pre-line" : "truncate"));
  const buttons = !noHover && (tools || copied || editable) && (
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
        <FieldButtons top={stacked} shown={editing}>
          {buttons}
        </FieldButtons>
      )}
    </>
  );
}

/** On a screen without hover: the value, a tap on it opening a bubble of its actions. */
function ActionsBubble({
  label,
  copied,
  tools,
  onEdit,
  onOpen,
  children,
}: {
  label: string;
  copied: string | null;
  tools?: ReactNode;
  onEdit?: () => void;
  onOpen?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const close = () => setOpen(false);

  return (
    <>
      <div
        ref={setAnchor}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-label={`Actions : ${label}`}
        onClick={(event) => {
          // Kept from the row of a table, opened from the bubble instead.
          event.stopPropagation();
          setDone(false);
          setOpen(true);
        }}
        className="min-w-0 cursor-pointer"
      >
        {children}
      </div>
      <Popover open={open} onOpenChange={(next) => !next && close()}>
        <PopoverContent anchor={anchor} side="top" align="center" className="w-auto min-w-44 gap-0.5 p-1" aria-label={label}>
          <FieldMenuClose value={close}>
            {onOpen && (
              <FieldMenuItem label="Ouvrir" onClick={() => {
                  close();
                  onOpen();
                }}>
                <PanelRightOpenIcon />
              </FieldMenuItem>
            )}
            {tools}
            {copied && (
              <FieldMenuItem
                label={done ? "Copié" : "Copier"}
                onClick={() =>
                  void navigator.clipboard.writeText(copied).then(() => {
                    setDone(true);
                    setTimeout(close, 600);
                  })
                }
              >
                {done ? <CopyCheckIcon /> : <CopyIcon />}
              </FieldMenuItem>
            )}
            {onEdit && (
              <FieldMenuItem label="Modifier" onClick={() => {
                  close();
                  onEdit();
                }}>
                <PencilIcon />
              </FieldMenuItem>
            )}
          </FieldMenuClose>
        </PopoverContent>
      </Popover>
    </>
  );
}

/** Tells a field editable: a small blue dot at the top right of its label, named in a bubble. */
export function EditableMark() {
  return (
    <Tip label="Champ modifiable">
      <span aria-label="Champ modifiable" className="-ml-0.5 size-1.5 shrink-0 -translate-y-1.5 rounded-full bg-blue-500" />
    </Tip>
  );
}
