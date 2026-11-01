"use client";

import type { ReactNode } from "react";
import { FLOATING_BUTTON } from "@/components/admin/data-table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * A button floating at the right of a field on hover, beside copy and edit,
 * named in a bubble: the `tools` of a `DetailField`.
 */
export function DetailFieldButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        delay={400}
        render={
          <button
            type="button"
            aria-label={label}
            disabled={disabled}
            // Pressed before a field being edited loses its focus, which would save.
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            className={FLOATING_BUTTON}
          >
            {children}
          </button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** The buttons floating at the right of a value: at its top with `top` (a long text, several lines), else centred; on hover only unless `shown`. */
export function FieldButtons({ top, shown, children }: { top?: boolean; shown?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "absolute right-1.5 z-10 flex items-center gap-1",
        top ? "top-1" : "top-1/2 -translate-y-1/2",
        !shown && "opacity-0 transition-opacity group-hover/cell:opacity-100 has-focus-visible:opacity-100",
      )}
    >
      {children}
    </span>
  );
}
