"use client";

import { ChevronRightIcon, RotateCcwIcon } from "lucide-react";
import { type ReactNode, useEffect, useEffectEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * What `load` answers, loaded again on a new `refreshKey` (the list shown
 * meanwhile); `retry` after a failure. Shared by the blocks loading their
 * own rows.
 */
export function useDetailLoad<D>(load: () => Promise<D>, refreshKey: unknown) {
  const [state, setState] = useState<{ data?: D; failed?: boolean; key: unknown; tries: number } | null>(null);
  const [tries, setTries] = useState(0);
  const run = useEffectEvent(() => load());
  useEffect(() => {
    let live = true;
    run().then(
      (data) => live && setState({ data, key: refreshKey, tries }),
      () => live && setState((last) => ({ data: last?.data, failed: true, key: refreshKey, tries })),
    );
    return () => {
      live = false;
    };
  }, [refreshKey, tries]);
  return { data: state?.data, failed: !!state?.failed && state.tries === tries, loading: !state || state.tries !== tries, retry: () => setTries((n) => n + 1) };
}

/** A row related to the one shown, e.g. an account holding a badge. */
export interface DetailRelatedItem {
  id: string;
  /** An avatar, an icon. */
  media?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** On its right, e.g. a date. */
  aside?: ReactNode;
  /** Opens it, e.g. in the panel. */
  onOpen?: () => void;
}

/**
 * Rows related to the one shown, loaded by the block itself: the first ones
 * (`load` answers them and their `total`), each opened on click, « Voir
 * tout » (`more`) beyond. Skeleton meanwhile, `empty` without any, a retry
 * after a failure; a new `refreshKey` loads them again.
 */
export function DetailRelated({
  load,
  refreshKey,
  empty,
  more,
}: {
  load: () => Promise<{ items: DetailRelatedItem[]; total: number }>;
  refreshKey?: unknown;
  empty: string;
  more?: { label: string; onClick: () => void };
}) {
  const { data, failed, retry } = useDetailLoad(load, refreshKey);
  if (failed && !data) return <Failed onRetry={retry} />;
  if (!data)
    return (
      <div className="flex flex-col gap-1" aria-busy>
        {Array.from({ length: 3 }, (_, at) => (
          <div key={at} className="flex items-center gap-3 px-2 py-1.5">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  if (data.items.length === 0) return <p className="py-2 text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-col">
      <ul className="-mx-2 flex flex-col">
        {data.items.map((item) => {
          const inside = (
            <>
              {item.media && <span className="shrink-0">{item.media}</span>}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{item.title}</span>
                {item.subtitle && <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>}
              </span>
              {item.aside && <span className="shrink-0 text-xs text-muted-foreground">{item.aside}</span>}
              {item.onOpen && <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
            </>
          );
          return (
            <li key={item.id}>
              {item.onOpen ? (
                <button type="button" onClick={item.onOpen} className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted">
                  {inside}
                </button>
              ) : (
                <div className="flex min-h-11 items-center gap-3 px-2 py-1.5">{inside}</div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {data.items.length < data.total ? `${data.items.length} sur ${data.total.toLocaleString("fr-FR")}` : `${data.total.toLocaleString("fr-FR")} au total`}
        </span>
        {more && data.items.length < data.total && (
          <Button size="xs" variant="ghost" onClick={more.onClick}>
            {more.label}
            <ChevronRightIcon aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}

/** The rows could not be loaded: told, and tried again. */
export function Failed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm text-muted-foreground">
      Chargement impossible.
      <Button size="sm" variant="outline" onClick={onRetry}>
        <RotateCcwIcon aria-hidden />
        Réessayer
      </Button>
    </div>
  );
}
