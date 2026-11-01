"use client";

import { createContext, type ReactNode, useContext, useLayoutEffect, useRef, useState } from "react";
import { Tip } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Inside `DetailActions`: whether its buttons show their icon only. Null elsewhere. */
const IconsOnly = createContext<boolean | null>(null);

/**
 * A row of `DetailAction`s on a single line, a line above it: under the
 * header, or between sections. The buttons share the whole width; when their
 * names no longer fit, they show their icon only, named in a bubble.
 * `sticky` keeps it at the bottom of the panel as the detail scrolls.
 */
export function DetailActions({ sticky, children }: { sticky?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [iconsOnly, setIconsOnly] = useState(false);
  // The width the names asked for when they stopped fitting.
  const needed = useRef(0);
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const fit = () => {
      if (!iconsOnly && row.scrollWidth > row.clientWidth) {
        needed.current = row.scrollWidth;
        setIconsOnly(true);
      } else if (iconsOnly && row.clientWidth >= needed.current) {
        setIconsOnly(false);
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    return () => observer.disconnect();
  }, [iconsOnly, children]);

  return (
    <IconsOnly.Provider value={iconsOnly}>
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 overflow-hidden border-t px-4 py-3",
          sticky && "sticky bottom-0 z-10 mt-auto bg-background/95 supports-backdrop-filter:backdrop-blur",
        )}
      >
        {children}
      </div>
    </IconsOnly.Provider>
  );
}

/**
 * A button of the detail. In `DetailActions`, it takes its share of the row,
 * its icon and name, or its icon alone when the row is too narrow; elsewhere
 * (e.g. the `actions` of `DetailHeader`) its icon alone. Its name is then in a
 * bubble. `href` makes it a link, opened in a new tab.
 */
export function DetailAction({
  label,
  icon,
  variant = "outline",
  href,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  variant?: "default" | "outline" | "destructive";
  href?: string;
  onClick?: () => void;
}) {
  const inRow = useContext(IconsOnly);
  const iconOnly = inRow !== false;
  const link = href ? { nativeButton: false, render: <a href={href} target="_blank" rel="noopener" /> } : {};
  const button = (
    <Button
      variant={variant}
      size={inRow === null ? "icon-sm" : "sm"}
      aria-label={iconOnly ? label : undefined}
      onClick={onClick}
      className={cn(inRow !== null && (iconOnly ? "min-w-0 flex-1" : "flex-[1_0_auto]"))}
      {...link}
    >
      {icon}
      {!iconOnly && label}
    </Button>
  );
  return iconOnly ? <Tip label={label}>{button}</Tip> : button;
}
