"use client";

import { GripVerticalIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CodeCell, BooleanCell, BytesCell, DateCell, NumberCell, RelativeDateCell, TextCell } from "./cells/values";
import { type CellUser, IconsCell, type IconItem, type Look, LookCell, type Pill, PillsCell, StatusCell, type Tone, UserCell } from "./cells/marks";
import { type CellImage, ImageCell, ImageCover } from "./cells/image";
import { formatBytes, formatDate, formatDateTime } from "./format";
import { OrderCell } from "./reorder";
import type { DataTableColumn } from "./types";

/*
 * One builder per kind of field, applying the rules of the kit: the cell of
 * its kind, a copy button on every value of text or numbers, a skeleton of
 * its shape.
 * For anything else, a `DataTableColumn` by hand, or `customColumn`.
 */

type Base<T> = Pick<DataTableColumn<T>, "id" | "header" | "icon" | "sortable" | "locked" | "className" | "href">;

/** The names of the items of a cell, all of them, those counted included; none when empty. */
const labelsOf = (items: { label: string }[]) => (items.length > 0 ? items.map((item) => item.label).join(", ") : null);

/** A free text, e.g. a name, a note, an e-mail (`muted`). */
export function textColumn<T>({ value, muted, width, ...base }: Base<T> & { value: (row: T) => string | null | undefined; muted?: boolean; width?: string }): DataTableColumn<T> {
  return { ...base, cell: (row) => <TextCell value={value(row)} muted={muted} className={width} />, copy: (row) => value(row) || null };
}

/** A technical value: an id, a key, a hash. */
export function codeColumn<T>({ value, width, ...base }: Base<T> & { value: (row: T) => string | null | undefined; width?: string }): DataTableColumn<T> {
  return { ...base, cell: (row) => <CodeCell value={value(row)} className={width} />, copy: (row) => value(row) || null };
}

/** A count; zero as missing unless `zero`. */
export function numberColumn<T>({ value, zero, unit, ...base }: Base<T> & { value: (row: T) => number | null | undefined; zero?: boolean; unit?: string }): DataTableColumn<T> {
  return {
    ...base,
    cell: (row) => <NumberCell value={value(row)} zero={zero} unit={unit} />,
    copy: (row) => {
      const number = value(row);
      return number === null || number === undefined || (number === 0 && !zero) ? null : String(number);
    },
    skeleton: <Skeleton className="inline-block h-4 w-12" />,
  };
}

/** A weight of files, in bytes. */
export function bytesColumn<T>({ value, ...base }: Base<T> & { value: (row: T) => number | null | undefined }): DataTableColumn<T> {
  return {
    ...base,
    cell: (row) => <BytesCell value={value(row)} />,
    copy: (row) => (value(row) ? formatBytes(value(row)!) : null),
    skeleton: <Skeleton className="inline-block h-4 w-14" />,
  };
}

/** A date, e.g. of creation; with `relative`, how long ago, e.g. a last visit. */
export function dateColumn<T>({
  value,
  time,
  relative,
  now,
  ...base
}: Base<T> & { value: (row: T) => string | null | undefined; time?: boolean; relative?: boolean; now?: number }): DataTableColumn<T> {
  return {
    ...base,
    cell: (row) => (relative ? <RelativeDateCell iso={value(row)} now={now} /> : <DateCell iso={value(row)} time={time} />),
    // The exact date, even for a relative one: « il y a 3 jours » tells nothing once pasted.
    copy: (row) => {
      const iso = value(row);
      return iso ? (time || relative ? formatDateTime(iso) : formatDate(iso)) : null;
    },
    skeleton: <Skeleton className="inline-block h-4 w-20" />,
  };
}

/** Yes or no: a check, or nothing. */
export function booleanColumn<T>({ value, ...base }: Base<T> & { value: (row: T) => boolean }): DataTableColumn<T> {
  return { ...base, cell: (row) => <BooleanCell value={value(row)} label={base.header} />, skeleton: <Skeleton className="size-4 rounded-sm" /> };
}

/** A state among a few, e.g. active or suspended: a dot and its label. */
export function statusColumn<T, K extends string>({
  value,
  statuses,
  ...base
}: Base<T> & { value: (row: T) => K; statuses: Record<K, { label: string; tone: Tone }> }): DataTableColumn<T> {
  return {
    ...base,
    cell: (row) => <StatusCell {...statuses[value(row)]} />,
    copy: (row) => statuses[value(row)].label,
    skeleton: (
      <span className="flex items-center gap-1.5">
        <Skeleton className="size-1.5 rounded-full" />
        <Skeleton className="h-4 w-14" />
      </span>
    ),
  };
}

/** Labels among many, e.g. categories. */
export function pillsColumn<T>({ value, max, ...base }: Base<T> & { value: (row: T) => Pill[]; max?: number }): DataTableColumn<T> {
  return { ...base, cell: (row) => <PillsCell items={value(row)} max={max} />, copy: (row) => labelsOf(value(row)), skeleton: <Skeleton className="h-5 w-20 rounded-full" /> };
}

/** Things told by their icon, e.g. connections or tags. */
export function iconsColumn<T>({ value, max, ...base }: Base<T> & { value: (row: T) => IconItem[]; max?: number }): DataTableColumn<T> {
  return { ...base, cell: (row) => <IconsCell items={value(row)} max={max} />, copy: (row) => labelsOf(value(row)), skeleton: <Skeleton className="h-6 w-14 rounded-md" /> };
}

/** An account, mostly the first column: locked, its @username copied; null shows `empty`, else a dash; `avatar: false` when an image column shows it. */
export function userColumn<T>({
  value,
  marks,
  empty,
  avatar = true,
  ...base
}: Base<T> & { value: (row: T) => CellUser | null; marks?: (row: T) => ReactNode; empty?: string; avatar?: boolean }): DataTableColumn<T> {
  return {
    locked: true,
    ...base,
    cell: (row) => <UserCell user={value(row)} marks={marks?.(row)} empty={empty} avatar={avatar} />,
    copy: (row) => value(row)?.username ?? null,
    skeleton: (
      <span className="flex items-center gap-2">
        {avatar && <Skeleton className="size-5 rounded-full" />}
        <Skeleton className="h-4 w-28" />
      </span>
    ),
  };
}

/** An item told by its look, e.g. a badge or a tag, mostly the first column: locked, its name copied. */
export function lookColumn<T>({ value, marks, ...base }: Base<T> & { value: (row: T) => Look; marks?: (row: T) => ReactNode }): DataTableColumn<T> {
  return {
    locked: true,
    ...base,
    cell: (row) => <LookCell look={value(row)} marks={marks?.(row)} />,
    copy: (row) => value(row).name,
    skeleton: (
      <span className="flex items-center gap-2">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </span>
    ),
  };
}

/** An image, e.g. a cover: a thumbnail in a table or a list, the cover of a card; a click opens it whole. */
export function imageColumn<T>({ value, ...base }: Base<T> & { value: (row: T) => CellImage | null | undefined }): DataTableColumn<T> {
  return {
    ...base,
    cell: (row) => <ImageCell image={value(row)} />,
    copy: (row) => value(row)?.src ?? null,
    cover: (row) => <ImageCover image={value(row)} />,
    skeleton: <Skeleton className="h-6 w-9 rounded-sm" />,
  };
}

/** Quick actions of a row, as `CellButtons`; `count` buttons drawn while loading. */
export function buttonsColumn<T>({ buttons, count = 2, ...base }: Base<T> & { buttons: (row: T) => ReactNode; count?: number }): DataTableColumn<T> {
  return {
    ...base,
    cell: buttons,
    skeleton: (
      <span className="flex items-center gap-1">
        {Array.from({ length: count }, (_, index) => (
          <Skeleton key={index} className="size-6 rounded-md" />
        ))}
      </span>
    ),
  };
}

/**
 * The place of the row in an order kept in the database, e.g. of badges.
 * Sortable; with `reorder` in the config, its handle moves the row.
 */
export function orderColumn<T>({ value, icon = <GripVerticalIcon />, ...base }: Omit<Base<T>, "icon" | "sortable"> & { icon?: ReactNode; value: (row: T) => number | null | undefined }): DataTableColumn<T> {
  return {
    ...base,
    icon,
    sortable: true,
    order: true,
    compact: true,
    className: cn("w-px", base.className),
    cell: (row) => <OrderCell value={value(row)} />,
    skeleton: <Skeleton className="inline-block h-4 w-6" />,
  };
}

/** Anything else: its own cell, still with the copy and skeleton of the kit when given. */
export function customColumn<T>(column: DataTableColumn<T>): DataTableColumn<T> {
  return column;
}
