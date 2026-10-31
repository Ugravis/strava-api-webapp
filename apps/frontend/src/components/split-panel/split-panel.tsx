"use client";

import { ArrowLeftIcon, ArrowRightIcon, ChevronLeftIcon, ChevronsRightIcon, Columns2Icon, Maximize2Icon, Minimize2Icon, PanelRightIcon, XIcon } from "lucide-react";
import { type PointerEvent, type ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSplitPanelState } from "./split-panel-provider";

const MIN_WIDTH = 320;
/** Of the window, so that the page beside always keeps some room. */
const MAX_SHARE = 0.7;
const SLIDE = "duration-200 ease-out motion-reduce:transition-none";

/**
 * The pages of a section with the panel on their right, above the footer,
 * which stays out of the area: the panel sticks to the top of the screen
 * (under the header of the site on a phone) and stops where the footer starts.
 * Floating over the pages, or beside them in split mode, where they shrink.
 */
export function SplitPanelArea({ children }: { children: ReactNode }) {
  const panel = useSplitPanelState();
  const { entry, mobile, folded, dragging } = panel;
  const full = panel.expanded && !!entry;
  const split = (panel.mode === "split" || full) && !mobile;
  const shown = !!entry && (!folded || full);
  // The last content stays while the panel slides out.
  const [last, setLast] = useState(entry);
  if (entry && entry !== last) setLast(entry);

  return (
    // Clipped sideways: the panel slid out on the right makes no scroll.
    <div className="relative flex min-w-0 flex-1 overflow-x-clip">
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      {/*
       * As tall as the pages: the panel inside sticks, then stops at the footer.
       * Of no width when floating, the panel then overflowing it on the left;
       * as wide as the panel in split mode, on a grey ground the page makes
       * room for: switching animates both. Over the whole page once expanded,
       * on the same ground, the page beneath out of sight.
       */}
      <div
        className={cn(
          "relative z-30 shrink-0 bg-muted/50",
          !split && "bg-transparent",
          full && "absolute inset-y-0 right-0 bg-[color-mix(in_oklab,var(--color-muted)_50%,var(--color-background))]",
          // None while the gutter is dragged: the page follows the pointer at once.
          !dragging && `transition-[width,background-color] ${SLIDE}`,
        )}
        style={{ width: full ? "100%" : split && shown ? panel.width : 0 }}
      >
        <div className="sticky top-14 h-[calc(100svh-3.5rem)] max-h-full md:top-0 md:h-svh">
          {/* Out of the panel once folded, so as to bring it back. */}
          {entry && folded && (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => panel.setFolded(false)}
              aria-label="Déplier le détail"
              title="Déplier le détail"
              // Centred by its margins, as the handle of the map panel.
              className="absolute inset-y-0 right-0 z-10 my-auto h-12 w-7 rounded-r-none border-r-0 bg-background shadow-md"
            >
              <ChevronLeftIcon aria-hidden />
            </Button>
          )}
          <aside
            aria-label="Détail"
            inert={!shown}
            // The same padding in both modes: the card keeps its width.
            style={{ width: mobile ? "100vw" : full ? "100%" : panel.width }}
            className={cn(
              "absolute inset-y-0 right-0 flex p-2 md:p-3",
              // A page of its own: no gutter, no card.
              full && "p-0 md:p-0",
              !dragging && `transition-[translate,opacity,width] ${SLIDE}`,
              !shown && "translate-x-full opacity-0",
            )}
          >
            {!mobile && !full && <ResizeGutter />}
            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background transition-shadow",
                SLIDE,
                split ? "shadow-none" : "shadow-xl",
                full && "rounded-none border-0",
              )}
            >
              <Header title={last?.title} />
              {/* The thin scrollbar of the tables. */}
              <div className="flex-1 overflow-y-auto overscroll-contain [scrollbar-color:color-mix(in_oklab,var(--color-muted-foreground)_35%,transparent)_transparent] [scrollbar-width:thin]">
                {/* Read as a page once expanded: a column of text, not a line across the screen. */}
                <div className={cn("flex min-h-full flex-col", full && "mx-auto w-full max-w-3xl")}>{last?.content}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * The margin left of the card, dragged to resize: the grey gutter of the split
 * mode. Moved by the distance from where it was grabbed, so that a mere click
 * changes nothing; a double click goes back to the default width.
 */
function ResizeGutter() {
  const { width, resize } = useSplitPanelState();
  const grab = useRef<{ x: number; width: number; moved: boolean } | null>(null);
  const clamp = (next: number) => Math.round(Math.min(Math.max(next, MIN_WIDTH), window.innerWidth * MAX_SHARE));
  const drag = (event: PointerEvent<HTMLDivElement>, done = false) => {
    const from = grab.current;
    if (!from) return;
    from.moved ||= Math.abs(event.clientX - from.x) > 2;
    if (done) grab.current = null;
    if (from.moved) resize(clamp(from.width + from.x - event.clientX), done);
  };
  return (
    <div
      aria-hidden
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        grab.current = { x: event.clientX, width, moved: false };
      }}
      onPointerMove={(event) => drag(event)}
      onPointerUp={(event) => drag(event, true)}
      onPointerCancel={() => (grab.current = null)}
      onDoubleClick={() => resize(null, true)}
      className="group/gutter absolute inset-y-0 left-0 z-10 flex w-3 cursor-col-resize touch-none items-center justify-center"
    >
      <span className="h-10 w-1 rounded-full bg-muted-foreground/25 opacity-0 transition-opacity group-hover/gutter:opacity-100" />
    </div>
  );
}

function Header({ title }: { title?: string }) {
  const panel = useSplitPanelState();
  const toggle = panel.mode === "split" ? "Faire flotter le panneau sur la page" : "Placer le panneau à côté de la page";
  return (
    <div className="flex h-12 shrink-0 items-center gap-0.5 border-b pr-2 pl-2">
      <IconButton label="Détail précédent" disabled={!panel.canBack} onClick={() => panel.go(-1)}>
        <ArrowLeftIcon />
      </IconButton>
      <IconButton label="Détail suivant" disabled={!panel.canForward} onClick={() => panel.go(1)}>
        <ArrowRightIcon />
      </IconButton>
      <p className="min-w-0 flex-1 truncate px-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">{title ?? "Détail"}</p>
      {!panel.expanded && (
        <IconButton label="Replier le panneau" onClick={() => panel.setFolded(true)}>
          <ChevronsRightIcon />
        </IconButton>
      )}
      {!panel.mobile && (
        <IconButton label={panel.expanded ? "Quitter le plein écran" : "Afficher en plein écran"} onClick={() => panel.setExpanded(!panel.expanded)}>
          {panel.expanded ? <Minimize2Icon /> : <Maximize2Icon />}
        </IconButton>
      )}
      {!panel.mobile && !panel.expanded && (
        <IconButton label={toggle} onClick={panel.toggleMode}>
          {panel.mode === "split" ? <PanelRightIcon /> : <Columns2Icon />}
        </IconButton>
      )}
      <IconButton label="Fermer le panneau" onClick={panel.close}>
        <XIcon />
      </IconButton>
    </div>
  );
}

/** An icon button of the header, its name in a bubble after a short pause. */
function IconButton({ label, children, ...props }: { label: string; children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger
        delay={400}
        render={
          <Button variant="ghost" size="icon-sm" aria-label={label} {...props}>
            {children}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
