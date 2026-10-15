"use client";

import { BugIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DevOverviewContent } from "./dev-overview-content";

/**
 * Temporary development tools: a floating button, next to the Next.js
 * indicator, opening the database overview. Its content only mounts (and
 * polls) while open. Remove together with `backend/src/dev`.
 */
export function DevToolbar() {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="Outils de développement"
        title="Outils de développement"
        className="fixed right-18 bottom-5 z-40 flex size-9 items-center justify-center rounded-full bg-zinc-900 text-amber-400 shadow-lg ring-1 ring-white/15 transition hover:bg-zinc-800 focus-visible:ring-3 focus-visible:ring-amber-400/50 focus-visible:outline-none"
      >
        <BugIcon className="size-4" />
      </SheetTrigger>
      <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-3xl">
        <SheetHeader className="pr-12">
          <SheetTitle className="flex items-center gap-2">
            <BugIcon className="size-4 text-amber-500" />
            Dev
          </SheetTitle>
          <SheetDescription>Base de données en lecture seule, visible en développement uniquement.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <DevOverviewContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
