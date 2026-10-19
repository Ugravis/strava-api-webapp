import { MapIcon } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import type { DistanceBadgeDetails } from "@/lib/api/types";

interface BadgeHistoryProps {
  /** Null while loading or after a failure. */
  details: DistanceBadgeDetails | null;
  error: boolean;
}

/** Every completion of a badge, the latest first, each with the activity that completed it. */
export function BadgeHistory({ details, error }: BadgeHistoryProps) {
  const t = useTranslations("distances.dialog.history");
  const format = useFormatter();
  const headingId = "badge-history";

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-xs font-medium text-muted-foreground uppercase">
        {t("title")}
      </h3>
      {details ? (
        <ol className="-mx-1 flex max-h-52 flex-col overflow-y-auto">
          {details.history.map(({ iteration, activity }) => (
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
