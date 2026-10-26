"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SectionNavItem {
  href: string;
  label: string;
}

/** Horizontal links between the pages of a section, the current one highlighted. */
export function SectionNav({ items, label }: { items: readonly SectionNavItem[]; label: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto">
      <ul className="flex w-max gap-1 px-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
