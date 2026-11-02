"use client";

import type { MouseEvent, KeyboardEvent } from "react";
import { EditableValue } from "../../detail/editable";
import type { DataTableColumn } from "../types";
import { drawCell } from "./base";

/**
 * The value of a cell, its copy and edit buttons floating at its right on
 * hover; on a screen without hover, a tap on it opens a bubble of its
 * actions, `onOpen` (the row) among them.
 */
export function CellValue<T>({ column, row, onOpen }: { column: DataTableColumn<T>; row: T; onOpen?: () => void }) {
  const edit = column.edit?.(row);
  // Nothing to copy nor edit: the cell alone.
  if (!edit && !column.copy)
    return drawCell(column, row);
  return (
    <EditableValue label={column.header} edit={edit} copy={column.copy?.(row) ?? null} onOpen={onOpen} href={column.href?.(row)}>
      {drawCell(column, row)}
    </EditableValue>
  );
}

/**
 * A click the row leaves to what it hit: its buttons, links, checkboxes and
 * fields, and what a popover of a cell shows outside of the row.
 */
export const keepsItsClick = (event: MouseEvent | KeyboardEvent) =>
  !(event.currentTarget as Node).contains(event.target as Node) ||
  !!(event.target as HTMLElement).closest("button, a, input, textarea, label, [role=checkbox], [role=switch], [role=menuitem]");
