"use client";

import type { ReactNode } from "react";
import { FLOATING_BUTTON } from "@/components/admin/data-table/cells/base";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * A button floating at the right of a field on hover, beside copy and edit,
 * named in a bubble: the `tools` of a `DetailField`.
 */
export function DetailFieldButton({ label, disabled, pressed, onClick, children }: { label: string; disabled?: boolean; pressed?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        delay={400}
        render={
          <button
            type="button"
            aria-label={label}
            disabled={disabled}
            aria-pressed={pressed}
            // Pressed before a field being edited loses its focus, which would save.
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              // Kept from the row of a table, which would open.
              event.stopPropagation();
              onClick();
            }}
            className={cn(FLOATING_BUTTON, pressed && "bg-muted text-foreground")}
          >
            {children}
          </button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The buttons floating at the right of a value: at its top with `top` (a long
 * text, several lines), else centred; on hover only unless `shown`. `docked`:
 * on a screen without hover, after the value in its line, always shown.
 */
export function FieldButtons({ top, shown, docked, children }: { top?: boolean; shown?: boolean; docked?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "absolute right-1.5 z-10 flex items-center gap-1",
        top ? "top-1" : "top-1/2 -translate-y-1/2",
        !shown && "opacity-0 transition-opacity group-hover/cell:opacity-100 has-focus-visible:opacity-100",
        docked && "[@media(hover:none)]:static [@media(hover:none)]:ml-2 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:self-start [@media(hover:none)]:pt-1 [@media(hover:none)]:opacity-100",
      )}
    >
      {children}
    </span>
  );
}
