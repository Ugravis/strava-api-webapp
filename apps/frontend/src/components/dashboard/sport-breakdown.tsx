"use client";

import { PieChartIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityFormat } from "@/hooks/use-activity-format";
import type { SportTotals } from "@/lib/api/types";
import { SportIcon } from "./sport-icon";

/** Sports listed by name; the others are gathered. */
const SHOWN_SPORTS = 4;

/** Share of the time spent moving in each sport. */
export function SportBreakdown({ sports }: { sports: SportTotals[] | null }) {
  const t = useTranslations("dashboard.sports");
  const format = useFormatter();
  const activityFormat = useActivityFormat();

  const total = (sports ?? []).reduce((sum, sport) => sum + sport.movingTimeS, 0);
  const shown = (sports ?? []).slice(0, SHOWN_SPORTS);
  const others = (sports ?? []).slice(SHOWN_SPORTS);
  const rows = [
    ...shown.map((sport) => ({ key: sport.sportType, label: activityFormat.sport(sport.sportType), ...sport })),
    ...(others.length > 0
      ? [
          {
            key: "others",
            label: t("others", { count: others.length }),
            sportType: "other",
            count: others.reduce((sum, sport) => sum + sport.count, 0),
            distanceM: others.reduce((sum, sport) => sum + sport.distanceM, 0),
            movingTimeS: others.reduce((sum, sport) => sum + sport.movingTimeS, 0),
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <PieChartIcon className="size-4 text-muted-foreground" aria-hidden />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sports === null ? (
          <div className="flex flex-col gap-4" aria-busy>
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-9" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => {
              const share = total > 0 ? row.movingTimeS / total : 0;
              return (
                <li
                  key={row.key}
                  className="flex flex-col gap-1.5"
                  title={t("detail", {
                    count: row.count,
                    time: activityFormat.duration(row.movingTimeS),
                    distance: activityFormat.distance(row.distanceM),
                  })}
                >
                  <div className="flex items-center gap-2">
                    <SportIcon sportType={row.sportType} className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">{row.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {activityFormat.duration(row.movingTimeS)}
                    </span>
                    <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums">
                      {format.number(share, { style: "percent", maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/70"
                      style={{ width: `${Math.max(share * 100, 1)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
