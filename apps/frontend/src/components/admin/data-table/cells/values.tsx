"use client";

import { CheckIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatBytes, formatDate, formatDateTime, formatNumber, formatRelative } from "../format";
import { EmptyValue, Truncate } from "./base";

/*
 * One cell per kind of value. Each one shows `EmptyValue` for a missing
 * value, so that a column never mixes blanks and dashes.
 */

/** A text cut to its width, whole on hover. */
export function TextCell({ value, muted, className }: { value: string | null | undefined; muted?: boolean; className?: string }) {
  if (!value) return <EmptyValue />;
  return <Truncate className={cn("max-w-56", muted && "text-muted-foreground", className)}>{value}</Truncate>;
}

/** A technical value: an id, a key, a hash. */
export function CodeCell({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return <EmptyValue />;
  return <Truncate className={cn("max-w-44 font-mono text-xs text-muted-foreground", className)}>{value}</Truncate>;
}

/** A count, grouped by thousands; zero as missing unless `zero`. */
export function NumberCell({ value, zero, unit }: { value: number | null | undefined; zero?: boolean; unit?: string }) {
  if (value === null || value === undefined || (value === 0 && !zero)) return <EmptyValue />;
  return (
    <span className="tabular-nums">
      {formatNumber(value)}
      {unit && <span className="text-muted-foreground"> {unit}</span>}
    </span>
  );
}

/** A weight of files, e.g. « 1,4 Mo »; zero as missing. */
export function BytesCell({ value }: { value: number | null | undefined }) {
  if (!value) return <EmptyValue />;
  return <span className="tabular-nums">{formatBytes(value)}</span>;
}

/** A day, or a day and time with `time`. */
export function DateCell({ iso, time }: { iso: string | null | undefined; time?: boolean }) {
  if (!iso) return <EmptyValue />;
  return (
    <time dateTime={iso} className="text-muted-foreground">
      {time ? formatDateTime(iso) : formatDate(iso)}
    </time>
  );
}

/** How long ago, the exact date on hover. `now` for fixed rows, e.g. demos. */
export function RelativeDateCell({ iso, now }: { iso: string | null | undefined; now?: number }) {
  if (!iso) return <EmptyValue />;
  return (
    <time dateTime={iso} title={formatDateTime(iso)}>
      {formatRelative(iso, now)}
    </time>
  );
}

/** A check when true, nothing to see when false. */
export function BooleanCell({ value, label }: { value: boolean; label: string }) {
  if (!value) return <EmptyValue />;
  return <CheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" aria-label={label} />;
}

/** A link, inside the app or outside; a click on it does not open the row. */
export function LinkCell({ href, children, className }: { href: string | null | undefined; children: ReactNode; className?: string }) {
  if (!href) return <EmptyValue />;
  const external = /^https?:/.test(href);
  return (
    <Link
      href={href}
      {...(external && { target: "_blank", rel: "noreferrer" })}
      className={cn("block max-w-56 truncate underline-offset-2 hover:underline", className)}
    >
      {children}
    </Link>
  );
}
