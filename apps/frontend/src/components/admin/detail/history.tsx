"use client";

import { type ReactNode, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Failed, LoadMoreButton, useDetailLoad } from "./related";
import { DetailTimeline, DetailTimelineItem } from "./timeline";

/** An event of the history of a row, e.g. an entry of the audit log. */
export interface DetailHistoryEvent {
  id: string;
  icon: ReactNode;
  tone?: "default" | "green" | "red" | "amber" | "blue";
  title: ReactNode;
  /** ISO. */
  date: string;
  /** Under its title, e.g. who did it, the value before and after. */
  details?: ReactNode;
}

/** `total`, when the server counts them: « Voir plus (n) » tells those left. */
type Page = { events: DetailHistoryEvent[]; next: string | null; total?: number };

/**
 * The history of the row shown, loaded by the block itself, the latest first:
 * `load(null)` its first events, `load(next)` the following ones, behind
 * « Voir plus (n) », `n` those left when the page tells its `total`.
 * Skeleton meanwhile, `empty` without any, a retry after a failure; a new
 * `refreshKey` (a save) loads it again from the start.
 */
export function DetailHistory({ load, refreshKey, now, empty = "Aucun événement." }: { load: (cursor: string | null) => Promise<Page>; refreshKey?: unknown; now?: number; empty?: string }) {
  const first = useDetailLoad(() => load(null), refreshKey);
  // The pages after the first one, dropped as it loads again.
  const [more, setMore] = useState<{ after: Page; pages: Page[] } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failedMore, setFailedMore] = useState(false);
  if (!first.data) return first.failed ? <Failed onRetry={first.retry} /> : <HistorySkeleton />;
  const pages = more?.after === first.data ? more.pages : [];
  const events = [first.data, ...pages].flatMap((page) => page.events);
  const next = (pages.at(-1) ?? first.data).next;
  const total = (pages.at(-1) ?? first.data).total;
  const left = total === undefined ? null : total - events.length;
  const loadMore = () => {
    if (!next || loadingMore) return;
    const after = first.data!;
    setLoadingMore(true);
    setFailedMore(false);
    load(next)
      .then((page) => setMore({ after, pages: [...pages, page] }), () => setFailedMore(true))
      .finally(() => setLoadingMore(false));
  };

  if (events.length === 0) return <p className="py-2 text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-col gap-3">
      <DetailTimeline>
        {events.map((event) => (
          <DetailTimelineItem key={event.id} icon={event.icon} tone={event.tone} title={event.title} date={event.date} now={now}>
            {event.details}
          </DetailTimelineItem>
        ))}
      </DetailTimeline>
      {next && (
        <LoadMoreButton size="sm" className="self-start" left={left} loading={loadingMore} failed={failedMore} onClick={loadMore} />
      )}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      {Array.from({ length: 3 }, (_, at) => (
        <div key={at} className="flex gap-3">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
