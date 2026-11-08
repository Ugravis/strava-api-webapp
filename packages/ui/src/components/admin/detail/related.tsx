"use client";

import { ChevronRightIcon, LoaderCircleIcon, RotateCcwIcon } from "lucide-react";
import { type ReactNode, useEffect, useEffectEvent, useState } from "react";
import { formatNumber } from "@kilotrace/ui/components/admin/data-table";
import { Button } from "@kilotrace/ui/components/ui/button";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";

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

type RelatedPage = { items: DetailRelatedItem[]; total: number };

/**
 * Rows related to the one shown, loaded by the block itself: `load(offset)`
 * answers those from `offset` and their `total`; « Voir plus (n) » loads the
 * next ones under them, `n` those left; `all` (« Voir tout », e.g. the list
 * filtered) beside it. Each opened on click. Skeleton meanwhile, `empty`
 * without any, a retry after a failure; a new `refreshKey` loads them again
 * from the start.
 */
export function DetailRelated({
  load,
  refreshKey,
  empty,
  all,
}: {
  load: (offset: number) => Promise<RelatedPage>;
  refreshKey?: unknown;
  empty: string;
  all?: { label: string; onClick: () => void };
}) {
  const first = useDetailLoad(() => load(0), refreshKey);
  // The pages after the first one, dropped as it loads again.
  const [more, setMore] = useState<{ after: RelatedPage; pages: RelatedPage[] } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failedMore, setFailedMore] = useState(false);
  const { failed, retry } = first;
  const pages = first.data && more?.after === first.data ? more.pages : [];
  const data = first.data && { items: [first.data, ...pages].flatMap((page) => page.items), total: (pages.at(-1) ?? first.data).total };
  const loadMore = () => {
    if (!data || loadingMore) return;
    const after = first.data!;
    setLoadingMore(true);
    setFailedMore(false);
    load(data.items.length)
      .then((page) => setMore({ after, pages: [...pages, page] }), () => setFailedMore(true))
      .finally(() => setLoadingMore(false));
  };
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
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {data.items.length < data.total ? `${data.items.length} sur ${formatNumber(data.total)}` : `${formatNumber(data.total)} au total`}
        </span>
        <span className="flex items-center gap-1">
          {data.items.length < data.total && (
            <LoadMoreButton size="xs" left={data.total - data.items.length} loading={loadingMore} failed={failedMore} onClick={loadMore} />
          )}
          {all && data.items.length < data.total && (
            <Button size="xs" variant="ghost" onClick={all.onClick}>
              {all.label}
              <ChevronRightIcon aria-hidden />
            </Button>
          )}
        </span>
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

/** « Voir plus », with how many are left when known; « Échec, réessayer » once it failed. */
export function LoadMoreButton({ left, loading, failed, size, className, onClick }: { left?: number | null; loading: boolean; failed: boolean; size: "xs" | "sm"; className?: string; onClick: () => void }) {
  return (
    <Button size={size} variant="ghost" className={className} disabled={loading} onClick={onClick}>
      {loading && <LoaderCircleIcon className="animate-spin" aria-hidden />}
      {failed ? "Échec, réessayer" : left ? `Voir plus (${formatNumber(left)})` : "Voir plus"}
    </Button>
  );
}
