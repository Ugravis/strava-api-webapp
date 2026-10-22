"use client";

import { ChevronRightIcon, HistoryIcon } from "lucide-react";
import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { useActivityFormat } from "@/hooks/use-activity-format";
import type { RecentActivity } from "@/lib/api/types";
import { addDays, dateOf, dayKey } from "./calendar";
import { SportIcon } from "./sport-icon";

/** The latest activities, grouped by day, each opening on the map. */
export function RecentActivities({ activities }: { activities: RecentActivity[] | null }) {
  const t = useTranslations("dashboard.recent");

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <HistoryIcon className="size-4 text-muted-foreground" aria-hidden />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        {activities === null ? (
          <ul className="flex flex-col gap-1" aria-busy>
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </li>
            ))}
          </ul>
        ) : activities.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {groupByDay(activities).map((group) => (
              <ActivityDayGroup key={group.date} date={group.date} activities={group.activities} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Activities by local day of their start, in the order given. */
function groupByDay(activities: RecentActivity[]): { date: string; activities: RecentActivity[] }[] {
  const groups: { date: string; activities: RecentActivity[] }[] = [];
  for (const activity of activities) {
    const date = dayKey(new Date(activity.startedAt));
    const last = groups.at(-1);
    if (last?.date === date) last.activities.push(activity);
    else groups.push({ date, activities: [activity] });
  }
  return groups;
}

/** A day named relatively to today, with the total distance of its activities, then the activities. */
function ActivityDayGroup({ date, activities }: { date: string; activities: RecentActivity[] }) {
  const t = useTranslations("dashboard.recent");
  const format = useFormatter();
  const activityFormat = useActivityFormat();
  const now = useNow({ updateInterval: 60_000 });
  const today = dayKey(now);
  const yesterday = dayKey(addDays(dateOf(today), -1));
  const label =
    date === today
      ? t("today")
      : date === yesterday
        ? t("yesterday")
        : format.dateTime(dateOf(date), { weekday: "long", day: "numeric", month: "long" });
  const distanceM = activities.reduce((total, activity) => total + activity.distanceM, 0);

  return (
    <section className="flex flex-col border-t pt-2 first:border-t-0 first:pt-0">
      <h3 className="flex items-baseline justify-between gap-2 pr-9 pl-2 text-[11px] text-muted-foreground">
        <span className="first-letter:uppercase">{label}</span>
        {distanceM > 0 && <span className="tabular-nums">{activityFormat.distance(distanceM)}</span>}
      </h3>
      <ul className="flex flex-col">
        {activities.map((activity) => (
          <RecentActivityRow key={activity.id} activity={activity} />
        ))}
      </ul>
    </section>
  );
}

function RecentActivityRow({ activity }: { activity: RecentActivity }) {
  const format = useFormatter();
  const activityFormat = useActivityFormat();

  return (
    <li>
      <Link
        href={`${routes.map}?activity=${activity.id}`}
        className="group flex items-center gap-3 rounded-lg px-2 py-2 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-background">
          <SportIcon sportType={activity.sportType} className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{activity.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {activityFormat.sport(activity.sportType)} · {format.dateTime(new Date(activity.startedAt), { timeStyle: "short" })}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end text-sm tabular-nums">
          <span className="font-medium">
            {activity.distanceM > 0 ? activityFormat.distance(activity.distanceM) : activityFormat.duration(activity.movingTimeS)}
          </span>
          <span className="text-xs text-muted-foreground">
            {activity.distanceM > 0
              ? activityFormat.duration(activity.movingTimeS)
              : activity.elevationGainM
                ? activityFormat.elevation(activity.elevationGainM)
                : "\u00a0"}
          </span>
        </span>
        <ChevronRightIcon
          className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        />
      </Link>
    </li>
  );
}
