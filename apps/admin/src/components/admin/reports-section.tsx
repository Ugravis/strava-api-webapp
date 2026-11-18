"use client";

import { ChevronDownIcon, FlagIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "@kilotrace/ui/lib/utils";

/**
 * The section of the reports of a page, folded on arrival when none is open:
 * the open ones in a red pill. The table stays mounted, so that a shared link still opens its report.
 */
export function ReportsSection({
  title,
  openCount,
  children,
}: {
  title: string;
  openCount: number;
  children: ReactNode;
}) {
  const [unfolded, setUnfolded] = useState(openCount > 0);
  return (
    <section id="reports" className="flex scroll-mt-20 flex-col gap-3" aria-labelledby="reports-title">
      <h2 id="reports-title" className="text-sm font-medium">
        <button type="button" className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={unfolded} aria-controls="reports-table" onClick={() => setUnfolded(!unfolded)}>
          <FlagIcon className="size-4 text-muted-foreground" aria-hidden />
          {title}
          {openCount > 0 && <span className="rounded-full bg-destructive px-1.5 text-xs text-white tabular-nums">{openCount}</span>}
          <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", !unfolded && "-rotate-90")} aria-hidden />
        </button>
      </h2>
      <div id="reports-table" hidden={!unfolded}>
        {children}
      </div>
    </section>
  );
}
