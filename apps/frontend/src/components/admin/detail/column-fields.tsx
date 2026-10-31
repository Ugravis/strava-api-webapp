"use client";

import { type DataTableColumn, drawCell } from "@/components/admin/data-table";
import { DetailField, DetailFields } from "./field";

/**
 * The fields of a row as its table draws them: the name, icon, cell and copy
 * of each column, in the order of `ids`. Columns of no value in a detail (the
 * order handle, buttons) are left to the caller not to name.
 */
export function DetailColumnFields<T>({ row, columns, ids }: { row: T; columns: DataTableColumn<T>[]; ids: (string | { id: string; stacked?: boolean })[] }) {
  const byId = new Map(columns.map((column) => [column.id, column]));
  return (
    <DetailFields>
      {ids.map((each) => {
        const { id, stacked } = typeof each === "string" ? { id: each, stacked: false } : each;
        const column = byId.get(id);
        if (!column) return null;
        return (
          <DetailField key={id} label={column.header} icon={column.icon} copy={column.copy?.(row)} stacked={stacked}>
            {drawCell(column, row)}
          </DetailField>
        );
      })}
    </DetailFields>
  );
}
