"use client";

import type { MouseEvent, KeyboardEvent } from "react";
import { EditableValue } from "../../detail/editable";
import type { DataTableColumn } from "../types";
import { CopyButton, drawCell } from "./base";

/** The value of a cell, its copy and edit buttons floating at its right on hover. */
export function CellValue<T>({ column, row }: { column: DataTableColumn<T>; row: T }) {
  const edit = column.edit?.(row);
  if (!edit)
    return (
      <>
        {drawCell(column, row)}
        {column.copy && <CopyButton value={column.copy(row)} />}
      </>
    );
  return (
    <EditableValue label={column.header} edit={edit} copy={column.copy?.(row) ?? null}>
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
  !!(event.target as HTMLElement).closest("button, a, input, textarea, label, [role=checkbox], [role=menuitem]");
