"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Bands under the map, folded together by a handle on their top edge, like
 * the side panel: folded, the map takes their height and only the handle stays.
 */
export function MapBands({ children }: { children: ReactNode }) {
  const t = useTranslations("map.bands");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative shrink-0">
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t("expand") : t("collapse")}
        className="absolute -top-7 left-1/2 z-10 h-7 w-12 -translate-x-1/2 rounded-b-none border-b-0 bg-background shadow-md"
      >
        {collapsed ? <ChevronUpIcon aria-hidden /> : <ChevronDownIcon aria-hidden />}
      </Button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden" inert={collapsed}>
          {children}
        </div>
      </div>
    </div>
  );
}
