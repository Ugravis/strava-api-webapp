"use client";

import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingPanelProps {
  labels: { panel: string; fold: string; unfold: string; close: string };
  title: string;
  children: ReactNode;
}

/**
 * Panel over the right of the page, which stays usable beside it, as on the
 * map: along the edge on narrow screens, a floating card from medium ones.
 * Folded, only its handle stays. Opened by a navigation, closed by going
 * back, so that the list behind keeps its filters. Generic: its texts come
 * from the caller.
 */
export function FloatingPanel({ labels, title, children }: FloatingPanelProps) {
  const router = useRouter();
  const [folded, setFolded] = useState(false);

  return (
    <aside
      aria-label={labels.panel}
      className={cn(
        "fixed inset-y-0 right-0 z-40 flex w-[min(100vw-1.75rem,28rem)] transition-transform duration-200 ease-out motion-reduce:transition-none md:py-3 md:pr-3",
        folded && "translate-x-full",
      )}
    >
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => setFolded(!folded)}
        aria-expanded={!folded}
        aria-label={folded ? labels.unfold : labels.fold}
        className={cn(
          // Centred by its margins, as the handle of the map panel.
          "absolute inset-y-0 my-auto rounded-r-none border-r-0 bg-background shadow-md",
          folded ? "-left-7 h-12 w-7" : "-left-4 h-9 w-4 [&_svg:not([class*='size-'])]:size-3",
        )}
      >
        {folded ? <ChevronLeftIcon aria-hidden /> : <ChevronRightIcon aria-hidden />}
      </Button>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-l bg-background shadow-xl md:rounded-xl md:border" inert={folded}>
        <div className="flex h-12 shrink-0 items-center gap-2 border-b pr-2 pl-4">
          <p className="min-w-0 flex-1 truncate text-xs font-medium tracking-wider text-muted-foreground uppercase">{title}</p>
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()} aria-label={labels.close} title={labels.close}>
            <XIcon aria-hidden />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </aside>
  );
}
