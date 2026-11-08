"use client";

import { type ReactNode, useState } from "react";
import { cn } from "@kilotrace/ui/lib/utils";
import { EditableMark, EditableValue } from "./editable";
import { FieldModifiable } from "./field-buttons";
import type { DetailEditKind, DetailFieldEdit } from "./edit-types";

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
 * The pencil of a popover stays shown while it is open, and closes it again,
 * giving up. Without children, the value is drawn after its kind. A small
 * blue dot at the top right of its icon tells the field modifiable: an
 * `edit`, or a button inside that changes it (a `DetailItemButton`, a tool
 * `modifies`); `editHint` forces it (`true`) or hides it (`false`). On a screen without hover (a phone), no button is
 * shown: a tap on the value opens a bubble of its actions. Bound to a draft
 * (`form.bind`), a field always open, a star after the label of a required one.
 */
export function DetailField<K extends DetailEditKind = "text">({
  label,
  icon,
  copy,
  stacked,
  tools,
  href,
  edit,
  editHint,
  children,
}: {
  label: string;
  icon?: ReactNode;
  copy?: string | null;
  stacked?: boolean;
  tools?: ReactNode;
  /** The outside page the value opens: on a phone, offered in the bubble of its actions. */
  href?: string | null;
  // Generic on its kind, so that the value given to `onSave` is typed, `text` without a kind.
  edit?: DetailFieldEdit<K> & { kind?: K };
  editHint?: boolean;
  children?: ReactNode;
}) {
  // Told by the buttons inside that change the value, e.g. « Retirer » of a tag.
  // Counted, several buttons coming and going.
  const [modifiers, setModifiers] = useState(0);
  const [count] = useState(() => (on: boolean) => setModifiers((n) => n + (on ? 1 : -1)));
  // A draft open: every field is typed, none marked; those required told by a star.
  const drafting = !!edit?.draft?.active;
  // A lock is no promise: not marked.
  const marked = !drafting && (editHint ?? ((!!edit && !edit.locked) || modifiers > 0));
  const required = drafting && !!edit?.required;
  return (
    <div className="contents">
      <dt className={cn("flex min-h-8 items-center gap-1.5 self-start text-muted-foreground", stacked && "col-span-2")}>
        {/* The dot of an editable field at the top right of its icon, as a badge on an icon; after the label without one. */}
        {icon && (
          <span className="relative inline-flex shrink-0 text-muted-foreground/70 [&_svg]:size-3.5">
            {icon}
            {marked && <EditableMark className="absolute -top-0.5 -right-0.5" />}
          </span>
        )}
        {label}
        {required && (
          <span className="-ml-1 text-destructive" aria-hidden>
            *
          </span>
        )}
        {marked && !icon && <EditableMark className="-ml-0.5 -translate-y-1.5" />}
      </dt>
      <dd
        className={cn(
          "group/cell relative flex min-h-8 min-w-0 items-center",
          // Its text wraps, cut nowhere.
          stacked && "col-span-2 mb-2 [&_.truncate]:whitespace-normal",
        )}
      >
        <FieldModifiable value={count}>
        <EditableValue
          label={label}
          copy={copy}
          tools={tools}
          href={href}
          edit={edit as DetailFieldEdit | undefined}
          stacked={stacked}
          // As wide as the panel: the widths of the table columns let go.
          valueClassName="wrap-break-word **:[[class*='max-w-']]:max-w-full"
        >
          {children}
        </EditableValue>
        </FieldModifiable>
      </dd>
    </div>
  );
}
