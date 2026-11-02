"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

/** The red of the error toasts (`richColors` of sonner), light and dark. */
const TONE = "border border-[hsl(359,100%,94%)] bg-[hsl(359,100%,97%)] text-[hsl(360,100%,45%)] dark:border-[hsl(357,89%,16%)] dark:bg-[hsl(358,76%,10%)] dark:text-[hsl(358,100%,81%)]";

/**
 * Why a value is refused, in a bubble centred above its field, in the red of
 * the error toasts: it moves nothing of the page. Shown while `message` is set.
 */
export function ErrorBubble({ anchor, message }: { anchor: Element | null; message: string | null }) {
  return (
    <TooltipPrimitive.Root open={!!message && !!anchor}>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner anchor={anchor} side="top" align="center" sideOffset={6} className="isolate z-50">
          <TooltipPrimitive.Popup role="alert" className={`max-w-xs rounded-md px-2.5 py-1.5 text-center text-xs font-medium shadow-md ${TONE}`}>
            {message}
            <TooltipPrimitive.Arrow className={`top-full size-2 -translate-y-1 rotate-45 border-t-0 border-l-0 ${TONE}`} />
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
