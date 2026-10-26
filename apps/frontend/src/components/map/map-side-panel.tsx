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
  /** What the content shows, between the arrows and the button closing the panel. */
  title: string;
  children: ReactNode;
}

/**
 * Panel along the right edge of the map, above the bands over its bottom,
 * browsing tiles and activities like a small browser. Along the edge on
 * narrow screens, a card floating over the map from medium ones, its width
 * counting the gaps. Folded, only its handle stays, to unfold it.
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
  title,
  children,
}: MapSidePanelProps) {
  const t = useTranslations("map.panel");

  return (
    <aside
      ref={ref}
      aria-label={t("label")}
      className={cn(
        "absolute top-0 right-0 bottom-(--map-bands-height,0px) z-10 flex w-(--map-panel-width) transition-transform duration-200 ease-out motion-reduce:transition-none md:py-3 md:pr-3",
        collapsed && "translate-x-full",
      )}
    >
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onCollapsedChange(!collapsed)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t("expand") : t("collapse")}
        className={cn(
          // Centred by its margins: a translation would be replaced by the one of the button pressed,
          // moving it from under the pointer before the click.
          "absolute inset-y-0 my-auto rounded-r-none border-r-0 bg-background shadow-md",
          // Discreet beside the open panel, larger once folded, to find it again.
          collapsed ? "-left-7 h-12 w-7" : "-left-4 h-9 w-4 [&_svg:not([class*='size-'])]:size-3",
        )}
      >
        {collapsed ? <ChevronLeftIcon aria-hidden /> : <ChevronRightIcon aria-hidden />}
      </Button>
      <div
        className="flex min-w-0 flex-1 flex-col overflow-hidden border-l bg-background shadow-xl md:rounded-xl md:border"
        inert={collapsed}
      >
        <div className="flex h-12 shrink-0 items-center gap-0.5 border-b px-2">
          <Button variant="ghost" size="icon-sm" onClick={onBack} disabled={!canGoBack} aria-label={t("back")} title={t("back")}>
            <ArrowLeftIcon aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onForward}
            disabled={!canGoForward}
            aria-label={t("forward")}
            title={t("forward")}
          >
            <ArrowRightIcon aria-hidden />
          </Button>
          <p className="min-w-0 flex-1 truncate px-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {title}
          </p>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("close")} title={t("close")}>
            <XIcon aria-hidden />
          </Button>
        </div>
        <div key={contentKey} className="flex-1 overflow-y-auto overscroll-contain p-4 text-sm">
          {children}
        </div>
      </div>
    </aside>
  );
}
