"use client";

import type { ReactNode } from "react";
import { type DataTableColumn, drawCell, WholeCells } from "@/components/admin/data-table";
import { DetailField, DetailFields } from "./field";
import type { DetailFieldEdit } from "./edit-types";

/**
 * A field of a row as its table draws it: the name, icon, cell and copy of
 * the column `id`. In a `DetailFields`, among free fields, so that they share
 * one list. `edit` edits it in place, as a `DetailField`, the value still
 * drawn by its column, whole: every item of a list shown, none counted.
 * Without it, the `edit` of the column, as in the table. Bound to a draft
 * (`form.bind`) open, the field alone: name and icon of the column, the
 * row never drawn, so left out in a draft of a new row.
 */
export function DetailColumnField<T>({
  row,
  columns,
  id,
  stacked,
  edit,
  editHint,
  tools,
}: {
  row?: T;
  columns: DataTableColumn<T>[];
  id: string;
  stacked?: boolean;
  edit?: DetailFieldEdit;
  editHint?: boolean;
  /** Buttons floating beside copy and edit, as the `tools` of a `DetailField`; else those of the column. */
  tools?: ReactNode;
}) {
  const column = columns.find((each) => each.id === id);
  if (!column) return null;
  // A draft open: its field only, the row (a draft, not yet one) never drawn.
  if (edit?.draft?.active) return <DetailField label={column.header} icon={column.icon} stacked={stacked} edit={edit} />;
  if (row === undefined) return null;
  return (
    <DetailField label={column.header} icon={column.icon} copy={column.copy?.(row) ?? null} href={column.href?.(row)} stacked={stacked} edit={edit ?? column.edit?.(row)} editHint={editHint} tools={tools ?? column.tools?.(row)}>
      <WholeCells value>{column.detailCell ? column.detailCell(row) : drawCell(column, row)}</WholeCells>
    </DetailField>
  );
}

/**
 * The fields of a row as its table draws them, in the order of `ids`, in a
 * list of their own. Columns of no value in a detail (the order handle,
 * buttons) are left to the caller not to name.
 */
export function DetailColumnFields<T>({ row, columns, ids }: { row?: T; columns: DataTableColumn<T>[]; ids: (string | { id: string; stacked?: boolean; edit?: DetailFieldEdit; editHint?: boolean; tools?: ReactNode })[] }) {
  return (
    <DetailFields>
      {ids.map((each) => {
        const { id, ...rest } = typeof each === "string" ? { id: each } : each;
        return <DetailColumnField key={id} row={row} columns={columns} id={id} {...rest} />;
      })}
    </DetailFields>
  );
}
