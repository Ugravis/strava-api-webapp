import type { AdminRole } from "@kilotrace/shared/admin";
import { ListClockIcon, type LucideIcon, PackageIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { HeroBackdrop } from "@/components/dashboard/dashboard-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { publicNameOf } from "@/lib/user";
import { cn } from "@/lib/utils";
import { ROLE_ICONS } from "../team/team-bits";
import { dashboardData } from "./data";

const PARIS = "Europe/Paris";
const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: PARIS });
const hourOf = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: PARIS });

/** The frame of the dashboard of the site, its tiles in blue to tell the back office apart. */
const FRAME =
  "relative isolate overflow-hidden rounded-2xl bg-linear-to-br from-card via-card to-blue-50 p-5 text-foreground ring-1 ring-blue-200 sm:p-7 dark:to-blue-950/40 dark:ring-blue-900/60";

/** The colors of the roles of the team page. */
const ROLE_PILLS: Record<AdminRole, string> = {
  support: "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300",
  admin: "bg-blue-500/10 text-blue-700 ring-blue-500/25 dark:text-blue-300",
  "super-admin": "bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300",
};

const PILL = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1";

/** A figure of the hero: an icon, a name and its value, a link when it leads somewhere. */
function HeroFact({ icon: Icon, label, children, href }: { icon: LucideIcon; label: string; children: ReactNode; href?: string }) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/15">
        <Icon className="size-4 text-blue-600 dark:text-blue-400" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-medium tabular-nums">{children}</span>
      </span>
    </>
  );
  const className = "flex items-center gap-3 rounded-xl bg-card/70 px-3.5 py-3 ring-1 ring-blue-200/70 dark:ring-blue-900/50";
  return href ? (
    <Link href={href} className={cn(className, "transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/40")}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

interface DashboardHeroProps {
  memberId: string;
  roles: AdminRole[];
}

/** Greets the member as the dashboard of the site does: the day, the pulse of the site, their roles and actions, the version. */
export async function DashboardHero({ memberId, roles }: DashboardHeroProps) {
  const t = getAdminTranslations("dashboard.hero");
  const roleLabel = getAdminTranslations("roles");
  // The day and hour of the request, never those of a prerender.
  const [user, dev, mine, audit, users] = await Promise.all([
    getCurrentUser(),
    dashboardData.dev(),
    dashboardData.auditOf(memberId),
    dashboardData.audit(),
    dashboardData.users(),
    connection(),
  ]);
  const now = new Date();
  // Read from its part: the formatted hour may carry a unit, e.g. « 23 h ».
  const hour = Number(hourOf.formatToParts(now).find((part) => part.type === "hour")?.value);
  const greeting = hour < 5 || hour >= 18 ? "evening" : "morning";
  return (
    <section className={FRAME}>
      <HeroBackdrop id="admin-hero-tiles" tone="text-blue-500" tiles="opacity-50" station="fill-card" />
      <div className="flex flex-col gap-6">
        <div className="flex min-w-0 items-center gap-4">
          {user && <UserAvatar user={user} className="size-14 shrink-0 ring-2 ring-blue-200 sm:size-16 dark:ring-blue-900" fallbackClassName="text-lg" />}
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs font-medium tracking-wide text-blue-600 uppercase dark:text-blue-400">{today.format(now)}</p>
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{user ? t(greeting, { name: publicNameOf(user) }) : t("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {audit && users
                ? t.rich("pulse", {
                    actions: audit.today,
                    signups: users.signups,
                    strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
                  })
                : t("description")}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 border-t border-blue-200/70 pt-5 dark:border-blue-900/50 sm:grid-cols-3 sm:gap-4">
          <HeroFact icon={ShieldCheckIcon} label={t(roles.length > 1 ? "roles" : "role")}>
            {roles.map((role) => {
              const Icon = ROLE_ICONS[role];
              return (
                <span key={role} className={cn(PILL, ROLE_PILLS[role])}>
                  <Icon className="size-3" aria-hidden />
                  {roleLabel(role)}
                </span>
              );
            })}
          </HeroFact>
          <HeroFact icon={ListClockIcon} label={t("actions")} href={`${adminRoutes.auditLog}?actor=${memberId}`}>
            {mine ? t("actionsValue", { count: mine.total }) : "–"}
          </HeroFact>
          <HeroFact icon={PackageIcon} label={t("version")} href={adminRoutes.dev}>
            {dev ? (
              <>
                <span className={cn(PILL, "bg-blue-500/10 font-mono text-blue-700 ring-blue-500/25 dark:text-blue-300")}>v{dev.version}</span>
                <span className="text-muted-foreground">{dev.environment}</span>
              </>
            ) : (
              "–"
            )}
          </HeroFact>
        </div>
      </div>
    </section>
  );
}

export function DashboardHeroSkeleton() {
  return (
    <section className={FRAME}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 shrink-0 rounded-full bg-blue-100/60 dark:bg-blue-900/30 sm:size-16" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-32 bg-blue-100/60 dark:bg-blue-900/30" />
            <Skeleton className="h-8 w-64 max-w-full bg-blue-100/60 dark:bg-blue-900/30" />
            <Skeleton className="h-4 w-80 max-w-full bg-blue-100/60 dark:bg-blue-900/30" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 border-t border-blue-200/70 pt-5 dark:border-blue-900/50 sm:grid-cols-3 sm:gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl bg-blue-100/60 dark:bg-blue-900/30" />
          ))}
        </div>
      </div>
    </section>
  );
}
