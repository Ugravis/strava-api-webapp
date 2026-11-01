"use client";

import { type DataTableColumn, drawCell } from "@/components/admin/data-table";
import { DetailField, DetailFields } from "./field";

/**
 * A field of a row as its table draws it: the name, icon, cell and copy of
 * the column `id`. In a `DetailFields`, among free fields, so that they share
 * one list.
 */
export function DetailColumnField<T>({ row, columns, id, stacked }: { row: T; columns: DataTableColumn<T>[]; id: string; stacked?: boolean }) {
  const column = columns.find((each) => each.id === id);
  if (!column) return null;
  return (
    <DetailField label={column.header} icon={column.icon} copy={column.copy?.(row) ?? null} stacked={stacked}>
      {drawCell(column, row)}
    </DetailField>
  );
}

/**
 * The fields of a row as its table draws them, in the order of `ids`, in a
 * list of their own. Columns of no value in a detail (the order handle,
 * buttons) are left to the caller not to name.
 */
export function DetailColumnFields<T>({ row, columns, ids }: { row: T; columns: DataTableColumn<T>[]; ids: (string | { id: string; stacked?: boolean })[] }) {
  return (
    <DetailFields>
      {ids.map((each) => {
        const { id, stacked } = typeof each === "string" ? { id: each, stacked: false } : each;
        return <DetailColumnField key={id} row={row} columns={columns} id={id} stacked={stacked} />;
      })}
    </DetailFields>
  );
}
