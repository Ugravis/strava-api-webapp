"use client";

import { CopyCheckIcon, CopyIcon, PanelRightOpenIcon, PencilIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { CopyButton, EmptyValue } from "@/components/admin/data-table/cells/base";
import { Tip } from "@/components/admin/data-table/tip";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { useNoHover } from "@/hooks/use-no-hover";
import { cn } from "@/lib/utils";
import { DetailFieldButton, FieldButtons, FieldMenuClose, FieldMenuItem } from "./field-buttons";
import { type DetailFieldEdit, EditValue, editCopy, editEmpty, type InlineEdit, InlineEditor, isInline } from "./field-edit";
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
 * each with its icon and its name, `onOpen` first (the row of a table), a
 * second tap closing it. `cell`: in a cell of a table, typed on a phone in a
 * bubble under it, which the screen holds, rather than in the narrow cell.
 */
export function EditableValue({
  label,
  copy,
  tools,
  edit,
  stacked,
  onOpen,
  cell,
  valueClassName,
  children,
}: {
  label: string;
  copy?: string | null;
  tools?: ReactNode;
  edit?: DetailFieldEdit;
  stacked?: boolean;
  onOpen?: () => void;
  cell?: boolean;
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

  // Typed in the cell itself, unless a phone: in a bubble under it.
  const floating = cell && noHover;
  if (edit && editing && isInline(edit) && !floating) return <InlineEditor edit={edit} label={label} onClose={() => setEditing(false)} />;
  return (
    <>
      {edit && editing && isInline(edit) && floating ? (
        <FloatingEditor edit={edit} label={label} className={valueClass} onClose={() => setEditing(false)}>
          {drawnValue}
        </FloatingEditor>
      ) : edit && !isInline(edit) && edit.kind !== "switch" ? (
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
  // A tap on the value again closes the bubble: left to its own click.
  const fromValue = (target: EventTarget | null) => target instanceof Node && !!anchor?.contains(target);

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
          setOpen((shown) => !shown);
        }}
        className="min-w-0 cursor-pointer"
      >
        {children}
      </div>
      <Popover open={open} onOpenChange={(next, details) => !next && !(details.reason === "outside-press" && fromValue(details.event.target)) && close()}>
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

/**
 * On a phone, the field typing the value of a cell, in a bubble centred under
 * it that the screen holds. Leaving the field saves; Esc gives up.
 */
function FloatingEditor({ edit, label, className, onClose, children }: { edit: InlineEdit; label: string; className?: string; onClose: () => void; children: ReactNode }) {
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  return (
    <>
      <div ref={setAnchor} className={className}>
        {children}
      </div>
      <Popover
        open
        onOpenChange={(open, details) => {
          // A tap outside leaves the field, which saves; Esc gives up.
          if (!open && details.reason === "escape-key") {
            details.event.preventDefault();
            onClose();
          }
        }}
      >
        <PopoverContent anchor={anchor} align="center" className="w-[min(20rem,calc(100vw-1rem))] p-2" aria-label={label}>
          <InlineEditor edit={edit} label={label} onClose={onClose} />
        </PopoverContent>
      </Popover>
    </>
  );
}

/** Tells a field editable: a small blue dot, named in a bubble, at the top right of the icon of the field (`className` places it). */
export function EditableMark({ className }: { className?: string }) {
  return (
    <Tip label="Champ modifiable">
      <span aria-label="Champ modifiable" className={cn("size-1.5 shrink-0 rounded-full bg-blue-500 ring-2 ring-background", className)} />
    </Tip>
  );
}
