"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Its name in a bubble, after a short pause on it: every icon-only button has one. */
export function Tip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger delay={400} render={children} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
