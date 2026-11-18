"use client";

import { CheckIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { progressTier } from "@kilotrace/ui/lib/progress-tier";
import { cn } from "@kilotrace/ui/lib/utils";
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

const PERCENT = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });

/** A share as a percentage, e.g. « 12,5 % »: kept above zero when the share is, a sliver never shown as nothing. */
export function formatShare(share: number): string {
  return share > 0 && share < 0.0005 ? "< 0,1 %" : PERCENT.format(share);
}

/** How a share is drawn beside its percentage. */
export type ShareLook = "bar" | "ring" | "number";

const RING_RADIUS = 5.5;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * A share of a whole, from 0 to 1: its percentage after a ring or a bar
 * filled as much (`look`), as Notion draws its numbers, the figure muted
 * beside the drawing; colored by its tier, as the badges of the site (blue,
 * amber from 50 %, green from 75 %); null as missing.
 */
export function ShareCell({ value, look = "ring" }: { value: number | null | undefined; look?: ShareLook }) {
  if (value === null || value === undefined || Number.isNaN(value)) return <EmptyValue />;
  const share = Math.min(1, Math.max(0, value));
  const tier = progressTier(share);
  if (look === "number") return <span className="tabular-nums">{formatShare(value)}</span>;
  const label = <span className="text-xs text-muted-foreground tabular-nums">{formatShare(value)}</span>;
  if (look === "ring") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <svg viewBox="0 0 14 14" className="size-4 shrink-0 -rotate-90" aria-hidden>
          <circle cx="7" cy="7" r={RING_RADIUS} fill="none" strokeWidth="2.5" className="stroke-muted-foreground/25" />
          {share > 0 && (
            <circle
              cx="7"
              cy="7"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(share * RING_LENGTH, 0.5)} ${RING_LENGTH}`}
              className={tier.stroke}
            />
          )}
        </svg>
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden>
        {share > 0 && <span className={cn("block h-full min-w-0.5 rounded-full", tier.fill)} style={{ width: `${share * 100}%` }} />}
      </span>
      {label}
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
