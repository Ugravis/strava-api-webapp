import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { Badge } from "@kilotrace/ui/components/ui/badge";
import { Button } from "@kilotrace/ui/components/ui/button";
import { UserAvatar } from "@kilotrace/ui/components/user/user-avatar";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { publicNameOf } from "@kilotrace/ui/lib/user";
import { withTexts } from "../audit-log/entry-text";
import { dashboardData } from "./data";
import { DashboardCard, DashboardUnavailable } from "./parts";

/** Opens a row of a list page in its side panel. */
const rowHref = (route: string, id: string) => `${route}?row=${encodeURIComponent(id)}`;

const PARIS = "Europe/Paris";
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: PARIS });
const dayTitle = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: PARIS });
const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: PARIS });

/** Rows split by day of the site, the latest first as given. */
function byDay<T>(rows: T[], dateOf: (row: T) => string): { key: string; date: Date; rows: T[] }[] {
  const days = new Map<string, { key: string; date: Date; rows: T[] }>();
  for (const row of rows) {
    const date = new Date(dateOf(row));
    const key = dayKey.format(date);
    const day = days.get(key) ?? { key, date, rows: [] };
    day.rows.push(row);
    days.set(key, day);
  }
  return [...days.values()];
}

/** « Aujourd'hui », « Hier », otherwise the day in words. */
function dayLabel(date: Date, now = Date.now()): string {
  const t = getAdminTranslations("dashboard.days");
  const key = dayKey.format(date);
  if (key === dayKey.format(now)) return t("today");
  if (key === dayKey.format(now - 86_400_000)) return t("yesterday");
  return dayTitle.format(date);
}

/** A list scrolling inside its card, its days titled as it scrolls. */
async function DayGroups<T>({ rows, dateOf, render, more }: { rows: T[]; dateOf: (row: T) => string; render: (row: T) => ReactNode; more: { href: string; label: string } }) {
  // Today of the request, never the one of a prerender.
  await connection();
  return (
    // The thin scrollbar of the tables and of the split panel.
    <div className="-mx-2 h-156 overflow-y-auto overscroll-contain px-2 [scrollbar-color:color-mix(in_oklab,var(--color-muted-foreground)_35%,transparent)_transparent] [scrollbar-width:thin]">
      {byDay(rows, dateOf).map((day) => (
        <section key={day.key} aria-label={dayLabel(day.date)}>
          <h3 className="sticky top-0 z-10 -mx-2 bg-card px-2 py-1.5 text-xs font-medium text-muted-foreground first-letter:uppercase">
            {dayLabel(day.date)}
          </h3>
          <ul className="-mx-2 flex flex-col pb-2">{day.rows.map(render)}</ul>
        </section>
      ))}
      <Button variant="outline" size="sm" className="mt-1 mb-2 w-full" nativeButton={false} render={<Link href={more.href} />}>
        {more.label}
        <ArrowRightIcon aria-hidden />
      </Button>
    </div>
  );
}

/** The latest accounts by day of sign-up, each opening in the panel of the users. */
export async function DashboardRecentUsers() {
  const t = getAdminTranslations("dashboard.recentUsers");
  const [users, overview] = await Promise.all([dashboardData.recentUsers(), dashboardData.users()]);
  return (
    <DashboardCard title={t("title")} description={overview && t("description", { count: overview.stravaConnected, total: overview.total })} href={adminRoutes.users}>
      {!users ? (
        <DashboardUnavailable />
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <DayGroups
          rows={users}
          more={{ href: adminRoutes.users, label: t("more") }}
          dateOf={(user) => user.createdAt}
          render={(user) => (
            <li key={user.id}>
              <Link href={rowHref(adminRoutes.users, user.id)} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted">
                <UserAvatar user={user} className="size-8" fallbackClassName="text-xs" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{publicNameOf(user)}</span>
                  <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-xs text-muted-foreground tabular-nums">{time.format(new Date(user.createdAt))}</span>
                  {user.suspension ? (
                    <Badge variant="destructive">{t("suspended")}</Badge>
                  ) : (
                    user.stravaConnected && <span className="text-[11px] font-medium text-[#fc4c02]">{t("strava")}</span>
                  )}
                </span>
              </Link>
            </li>
          )}
        />
      )}
    </DashboardCard>
  );
}

/** The latest actions of the team by day, as a feed. */
export async function DashboardTeamActivity() {
  const t = getAdminTranslations("dashboard.teamActivity");
  const [page, overview] = await Promise.all([dashboardData.auditEntries(), dashboardData.audit()]);
  const entries = page ? withTexts(page.items) : null;
  return (
    <DashboardCard
      title={t("title")}
      description={overview && t("description", { today: overview.today, actors: overview.actors })}
      href={adminRoutes.auditLog}
      className="lg:col-span-2"
    >
      {!entries ? (
        <DashboardUnavailable />
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <DayGroups
          rows={entries}
          more={{ href: adminRoutes.auditLog, label: t("more") }}
          dateOf={(entry) => entry.createdAt}
          render={(entry) => (
            <li key={entry.id}>
              <Link href={rowHref(adminRoutes.auditLog, entry.id)} className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted">
                {entry.actor?.username ? (
                  <UserAvatar user={{ ...entry.actor, username: entry.actor.username }} className="size-7" fallbackClassName="text-[10px]" />
                ) : (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                    {t("systemInitials")}
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm">
                    <span className="font-medium">{entry.actor ? (entry.actor.displayName ?? entry.actor.username ?? t("deleted")) : t("system")}</span>{" "}
                    <span className="text-muted-foreground">·</span> {entry.label}
                    {entry.targetUser?.username ? (
                      <span className="text-muted-foreground"> · @{entry.targetUser.username}</span>
                    ) : (
                      entry.target && <span className="text-muted-foreground"> · {entry.target.name}</span>
                    )}
                  </span>
                  {(entry.reason ?? entry.lines[0]) && <span className="line-clamp-1 text-xs text-muted-foreground">{entry.reason ?? entry.lines[0]}</span>}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">{time.format(new Date(entry.createdAt))}</span>
                  {!entry.succeeded && <Badge variant="destructive">{t("failed")}</Badge>}
                </span>
              </Link>
            </li>
          )}
        />
      )}
    </DashboardCard>
  );
}
