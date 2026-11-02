"use client";

import { type DataTableColumn, drawCell, WholeCells } from "@/components/admin/data-table";
import { DetailField, DetailFields } from "./field";
import type { DetailFieldEdit } from "./field-edit";

/**
 * A field of a row as its table draws it: the name, icon, cell and copy of
 * the column `id`. In a `DetailFields`, among free fields, so that they share
 * one list. `edit` edits it in place, as a `DetailField`, the value still
 * drawn by its column, whole: every item of a list shown, none counted.
 * Without it, the `edit` of the column, as in the table.
 */
export function DetailColumnField<T>({ row, columns, id, stacked, edit, editHint }: { row: T; columns: DataTableColumn<T>[]; id: string; stacked?: boolean; edit?: DetailFieldEdit; editHint?: boolean }) {
  const column = columns.find((each) => each.id === id);
  if (!column) return null;
  return (
    <DetailField label={column.header} icon={column.icon} copy={column.copy?.(row) ?? null} href={column.href?.(row)} stacked={stacked} edit={edit ?? column.edit?.(row)} editHint={editHint}>
      <WholeCells value>{drawCell(column, row)}</WholeCells>
    </DetailField>
  );
}

/**
 * The fields of a row as its table draws them, in the order of `ids`, in a
 * list of their own. Columns of no value in a detail (the order handle,
 * buttons) are left to the caller not to name.
 */
export function DetailColumnFields<T>({ row, columns, ids }: { row: T; columns: DataTableColumn<T>[]; ids: (string | { id: string; stacked?: boolean; edit?: DetailFieldEdit; editHint?: boolean })[] }) {
  return (
    <DetailFields>
      {ids.map((each) => {
        const { id, ...rest } = typeof each === "string" ? { id: each } : each;
        return <DetailColumnField key={id} row={row} columns={columns} id={id} {...rest} />;
      })}
    </DetailFields>
  );
}
