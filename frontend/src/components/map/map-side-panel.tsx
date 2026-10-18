"use client";

import { ArrowLeftIcon, ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode, Ref } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MapSidePanelProps {
  ref?: Ref<HTMLElement>;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  /** Only its button closes the panel: the map stays usable beside it. */
  onClose: () => void;
  /** Identifies the content: a new one is shown from its top. */
  contentKey: string;
  children: ReactNode;
}

/**
 * Panel along the right edge of the map, browsing tiles and activities like
 * a small browser. Folded, only its handle stays, to unfold it.
 */
export function MapSidePanel({
  ref,
  collapsed,
  onCollapsedChange,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onClose,
  contentKey,
  children,
}: MapSidePanelProps) {
  const t = useTranslations("map.panel");

  return (
    <aside
      ref={ref}
      aria-label={t("label")}
      className={cn(
        "absolute inset-y-0 right-0 z-10 flex w-(--map-panel-width) transition-transform duration-200 ease-out motion-reduce:transition-none",
        collapsed && "translate-x-full",
      )}
    >
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onCollapsedChange(!collapsed)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t("expand") : t("collapse")}
        className="absolute top-1/2 -left-7 h-12 w-7 -translate-y-1/2 rounded-r-none border-r-0 bg-background shadow-md"
      >
        {collapsed ? <ChevronLeftIcon aria-hidden /> : <ChevronRightIcon aria-hidden />}
      </Button>
      <div className="flex min-w-0 flex-1 flex-col border-l bg-background shadow-lg" inert={collapsed}>
        <div className="flex items-center gap-1 border-b px-2 py-1.5">
          <Button variant="ghost" size="icon-sm" onClick={onBack} disabled={!canGoBack} aria-label={t("back")}>
            <ArrowLeftIcon aria-hidden />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onForward} disabled={!canGoForward} aria-label={t("forward")}>
            <ArrowRightIcon aria-hidden />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("close")} className="ml-auto">
            <XIcon aria-hidden />
          </Button>
        </div>
        <div key={contentKey} className="flex-1 overflow-y-auto p-4 text-sm">
          {children}
        </div>
      </div>
    </aside>
  );
}
