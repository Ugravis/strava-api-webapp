"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createContext, type ReactNode, use, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

interface ListNavigation {
  pending: boolean;
  /** Query of the list being loaded, while pending. */
  target: URLSearchParams | null;
  /** Goes to another state of the list, its results replaced by a skeleton meanwhile. */
  navigate: (href: string) => void;
}

const ListNavigationContext = createContext<ListNavigation | null>(null);

/**
 * Shares the loading of a back-office list between its filters, its sorting
 * headers and its pagination, which all change the URL, and its results,
 * shown as a skeleton until the next ones are ready.
 */
export function ListNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<URLSearchParams | null>(null);
  const navigate = (href: string) => {
    setTarget(new URL(href, window.location.origin).searchParams);
    startTransition(() => router.replace(href, { scroll: false }));
  };
  return (
    <ListNavigationContext value={{ pending, target: pending ? target : null, navigate }}>{children}</ListNavigationContext>
  );
}

export function useListNavigation(): ListNavigation {
  const navigation = use(ListNavigationContext);
  if (!navigation) {
    throw new Error("useListNavigation must be used within a ListNavigationProvider");
  }
  return navigation;
}

interface ListResultsProps {
  /** Shown while the next results load: by the value of a query parameter, e.g. a view, else the first one. */
  skeletons: { param: string; byValue: Record<string, ReactNode> };
  children: ReactNode;
}

/** The results, or their skeleton while the next ones load. */
export function ListResults({ skeletons, children }: ListResultsProps) {
  const { pending, target } = useListNavigation();
  const current = useSearchParams();
  if (!pending) return children;
  // The skeleton of what is coming, e.g. the table once picked.
  const value = (target ?? current).get(skeletons.param) ?? "";
  return skeletons.byValue[value] ?? Object.values(skeletons.byValue)[0];
}

/** A link of the list, e.g. to a page of results, loading as its filters do. */
export function ListLink({ href, className, children, ...props }: React.ComponentProps<"a"> & { href: string }) {
  const { navigate } = useListNavigation();
  return (
    <a
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        navigate(href);
      }}
      className={className}
      {...props}
    >
      {children}
    </a>
  );
}

interface SortHeaderProps {
  label: string;
  /** Query parameter of the sort, and its value when left out. */
  param: string;
  defaultValue: string;
  /** Values of the column, ascending and descending, and the one a first click picks. */
  asc: string;
  desc: string;
  first: "asc" | "desc";
  basePath: string;
}

/** Header of a sortable column: a click sorts by it, a second one reverses the order. */
export function SortHeader({ label, param, defaultValue, asc, desc, first, basePath }: SortHeaderProps) {
  const params = useSearchParams();
  const { navigate } = useListNavigation();
  const current = params.get(param) ?? defaultValue;
  const direction = current === asc ? "asc" : current === desc ? "desc" : null;
  const nextValue = direction === "asc" ? desc : direction === "desc" ? asc : first === "asc" ? asc : desc;
  const Icon = direction === "asc" ? ArrowUpIcon : direction === "desc" ? ArrowDownIcon : ArrowUpDownIcon;

  return (
    <button
      type="button"
      onClick={() => {
        const next = new URLSearchParams(params);
        if (nextValue === defaultValue) next.delete(param);
        else next.set(param, nextValue);
        next.delete("page");
        const query = next.toString();
        navigate(query ? `${basePath}?${query}` : basePath);
      }}
      aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined}
      className="inline-flex items-center gap-1 rounded-sm font-medium outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {label}
      <Icon className={cn("size-3.5", !direction && "opacity-40")} aria-hidden />
    </button>
  );
}
