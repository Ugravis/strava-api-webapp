import { MapIcon } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@kilotrace/ui/components/button";
import { Skeleton } from "@kilotrace/ui/components/skeleton";
import { routes } from "@/config/routes";
import type { BadgeCompletion, DistanceBadge, DistanceBadgeDetails } from "@/lib/api/types";
import { distancesService } from "@/services/distances.service";

interface BadgeHistoryProps {
  badge: DistanceBadge;
  /** Null while loading or after a failure. */
  details: DistanceBadgeDetails | null;
  error: boolean;
}

/** Completions of a badge, the latest first, each with the activity that completed it; the older ones loaded on demand. */
export function BadgeHistory({ badge, details, error }: BadgeHistoryProps) {
  const t = useTranslations("distances.dialog.history");
  const format = useFormatter();
  const headingId = "badge-history";
  const [older, setOlder] = useState<BadgeCompletion[]>([]);
  const [loading, setLoading] = useState(false);
  const history = details ? [...details.history, ...older] : [];
  const left = badge.completions - history.length;

  const loadMore = () => {
    setLoading(true);
    distancesService
      .getBadgeHistory(badge.id, history.length)
      .then((page) => setOlder((current) => [...current, ...page]))
      .catch(() => toast.error(t("loadMoreError")))
      .finally(() => setLoading(false));
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-xs font-medium text-muted-foreground uppercase">
        {t("title")}
      </h3>
      {details ? (
        <div className="flex flex-col gap-2">
          <ol className="-mx-1 flex flex-col">
            {history.map(({ iteration, activity }) => (
              <li key={iteration}>
                <Link
                  href={`${routes.map}?activity=${activity.id}`}
                  aria-label={t("openOnMap", { number: iteration, name: activity.name })}
                  className="flex items-center gap-3 rounded-md px-1 py-1.5 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="w-8 shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                    {t("iteration", { number: iteration })}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{activity.name}</span>
                  <time dateTime={activity.startedAt} className="shrink-0 text-xs text-muted-foreground">
                    {format.dateTime(new Date(activity.startedAt), { dateStyle: "medium" })}
                  </time>
                  <MapIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
          {left > 0 && (
            <Button variant="outline" size="sm" className="self-center" onClick={loadMore} disabled={loading}>
              {t("loadMore", { count: left })}
            </Button>
          )}
        </div>
      ) : error ? (
        <p className="text-muted-foreground">{t("error")}</p>
      ) : (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 2 }, (_, row) => (
            <Skeleton key={row} className="h-5 w-full" />
          ))}
        </div>
      )}
    </section>
  );
}
