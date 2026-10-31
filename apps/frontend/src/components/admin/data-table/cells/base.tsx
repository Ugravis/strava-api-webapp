"use client";

import { CopyCheckIcon, CopyIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "../types";

/** A missing value. */
export function EmptyValue() {
  return <span className="text-muted-foreground/60">—</span>;
}

/**
 * A text cut to its width, shown whole in a bubble after a pause on it,
 * only when it is actually cut. Give it a `max-w-*`.
 */
export function Truncate({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  // The bubble is mounted at the first hover only: hundreds of them in a
  // table would slow every render of it.
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <span onPointerEnter={() => setArmed(true)} className={cn("block min-w-0 truncate", className)}>
        {children}
      </span>
    );
  }
  return (
    <Tooltip open={open} onOpenChange={(next) => setOpen(next && !!ref.current && ref.current.scrollWidth > ref.current.clientWidth)}>
      <TooltipTrigger delay={500} render={<span ref={ref} className={cn("block min-w-0 truncate", className)} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm break-all">{children}</TooltipContent>
    </Tooltip>
  );
}

/** The look of the buttons floating at the right of a value on hover: copy, and those of a detail. */
export const FLOATING_BUTTON =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5";

/**
 * Floats at the right of its cell on hover, copies its text. Set by the `copy`
 * of a column. `inline` leaves the place and the hover to a group of buttons.
 */
export function CopyButton({ value, inline }: { value: string | null; inline?: boolean }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  // Mounted at the first hover only, as for `Truncate`.
  const [armed, setArmed] = useState(false);
  if (!value) return null;
  const button = (
    <button
      type="button"
      aria-label={copied ? "Copié" : "Copier"}
      onPointerEnter={() => setArmed(true)}
      onClick={(event) => {
        event.stopPropagation();
        void navigator.clipboard.writeText(value).then(() => setCopied(true));
      }}
      className={cn(
        FLOATING_BUTTON,
        !inline && "absolute top-1/2 right-1.5 -translate-y-1/2 opacity-0 transition-opacity group-hover/cell:opacity-100 focus-visible:opacity-100",
      )}
    >
      {copied ? <CopyCheckIcon className="text-foreground" /> : <CopyIcon />}
    </button>
  );
  if (!armed) return button;
  return (
    <Tooltip>
      <TooltipTrigger delay={400} closeOnClick={false} render={button} />
      <TooltipContent>{copied ? "Copié" : "Copier"}</TooltipContent>
    </Tooltip>
  );
}

/** A small square around an icon, its name on hover. */
export function IconBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted [&_svg]:size-3.5">
      {children}
    </span>
  );
}

/** The items left out of a cell, counted, their names on hover. */
export function MoreCount({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <span title={names.join(", ")} className="px-0.5 text-xs text-muted-foreground tabular-nums">
      +{names.length}
    </span>
  );
}

/** The value of a cell, opening the outside page of its `href` when it has one. */
export function drawCell<T>(column: DataTableColumn<T>, row: T): ReactNode {
  const href = column.href?.(row);
  if (!href) return column.cell(row);
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-block max-w-full align-middle underline-offset-2 hover:underline">
      {column.cell(row)}
    </a>
  );
}
