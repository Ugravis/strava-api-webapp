"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

/**
 * Why a value is refused, in a red bubble above its field: it moves nothing
 * of the page. Shown while `message` is set.
 */
export function ErrorBubble({ anchor, message }: { anchor: Element | null; message: string | null }) {
  return (
    <TooltipPrimitive.Root open={!!message && !!anchor}>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner anchor={anchor} side="top" align="start" sideOffset={6} className="isolate z-50">
          <TooltipPrimitive.Popup role="alert" className="max-w-xs rounded-md bg-destructive px-2.5 py-1.5 text-xs font-medium text-white shadow-md">
            {message}
            <TooltipPrimitive.Arrow className="top-full size-2 -translate-y-1 rotate-45 bg-destructive" />
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
