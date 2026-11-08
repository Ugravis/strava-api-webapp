"use client";

import { createContext, type ReactNode, useContext, useLayoutEffect } from "react";
import { FLOATING_BUTTON } from "@kilotrace/ui/components/admin/data-table/cells/base";
import { Tooltip, TooltipContent, TooltipTrigger } from "@kilotrace/ui/components/ui/tooltip";
import { cn } from "@kilotrace/ui/lib/utils";

/** The blue of the buttons that save an edit: ✓ of a field, « Valider » of a popover. */
export const SAVE_BUTTON = "border-blue-600 bg-blue-600 text-white hover:bg-blue-600/90 hover:text-white";

/** A switch turned on: blue as the buttons that save, its thumb white. */
export const SWITCH_ON = "data-checked:bg-blue-600 dark:data-checked:bg-blue-600 dark:[&_[data-slot=switch-thumb][data-checked]]:bg-white";

/** Inside a field: told by a button that changes its value, the field then marked modifiable. */
export const FieldModifiable = createContext<((on: boolean) => void) | null>(null);

/** Marks the field around modifiable while mounted, when `modifies`. */
export function useModifies(modifies: boolean | undefined) {
  const mark = useContext(FieldModifiable);
  useLayoutEffect(() => {
    if (!modifies || !mark) return;
    mark(true);
    return () => mark(false);
  }, [modifies, mark]);
}

/** Inside the bubble of actions of a screen without hover: closes it. */
export const FieldMenuClose = createContext<(() => void) | null>(null);

/** A line of the bubble of actions of a screen without hover: its icon and its name. */
export function FieldMenuItem({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
    >
      {children}
      {label}
    </button>
  );
}

/**
 * A button floating at the right of a field on hover, beside copy and edit,
 * named in a bubble: the `tools` of a `DetailField`. On a screen without
 * hover, a line of the bubble of actions of the field.
 */
export function DetailFieldButton({
  label,
  disabled,
  pressed,
  primary,
  modifies,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  /** The button that saves: blue, as every button saving an edit. */
  primary?: boolean;
  /** It changes the value (a tool, e.g. reset): the field is marked modifiable. */
  modifies?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const close = useContext(FieldMenuClose);
  useModifies(modifies);
  if (close)
    return (
      <FieldMenuItem
        label={label}
        disabled={disabled}
        onClick={() => {
          close();
          onClick();
        }}
      >
        {children}
      </FieldMenuItem>
    );
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
            className={cn(FLOATING_BUTTON, pressed && "bg-muted text-foreground", primary && SAVE_BUTTON)}
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
