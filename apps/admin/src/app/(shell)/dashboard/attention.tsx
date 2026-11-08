import {
  ArrowRightIcon,
  BanIcon,
  CircleCheckIcon,
  DatabaseIcon,
  FlagIcon,
  GaugeIcon,
  GitBranchIcon,
  type LucideIcon,
  MegaphoneIcon,
  ReceiptTextIcon,
  TriangleAlertIcon,
  UserXIcon,
} from "lucide-react";
import Link from "next/link";
import { getFormatter } from "next-intl/server";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { cn } from "@kilotrace/ui/lib/utils";
import { dashboardData } from "./data";
import { QUOTA_WARNING } from "./kpis";

/** `critical` breaks something now, `warning` needs a decision, `info` is to keep in mind. */
type Severity = "critical" | "warning" | "info";

interface AttentionItem {
  key: string;
  severity: Severity;
  icon: LucideIcon;
  title: string;
  detail: string;
  href: string;
}

const SEVERITY_ORDER: Severity[] = ["critical", "warning", "info"];

const TONES: Record<Severity, string> = {
  critical: "bg-destructive/10 text-destructive",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

/** What the team has to look at, the most urgent first; a calm line when nothing. */
export async function DashboardAttention() {
  const t = getAdminTranslations("dashboard.attention");
  const [format, system, dev, commits, releaseNotes, audit, users, statistics, reports] = await Promise.all([
    getFormatter(),
    dashboardData.system(),
    dashboardData.dev(),
    dashboardData.commits(),
    dashboardData.releaseNotes(),
    dashboardData.audit(),
    dashboardData.users(),
    dashboardData.statistics(),
    dashboardData.reports(),
  ]);
  const today = statistics?.stravaUsage.days.at(-1);
  const quota = today?.read != null && today.readLimit ? today.read / today.readLimit : 0;

  const candidates: (AttentionItem | false | null | undefined | 0)[] = [
    dev && dev.pending.length > 0 && {
      key: "migrations",
      severity: "critical",
      icon: DatabaseIcon,
      title: t("migrations", { count: dev.pending.length }),
      detail: t("migrationsDetail"),
      href: adminRoutes.dev,
    },
    audit && audit.failures > 0 && {
      key: "failures",
      severity: "critical",
      icon: TriangleAlertIcon,
      title: t("failures", { count: audit.failures }),
      detail: t("failuresDetail", { week: audit.week }),
      href: adminRoutes.auditLog,
    },
    reports && reports.open > 0 && {
      key: "reports",
      severity: "warning",
      icon: FlagIcon,
      title: t("reports", { count: reports.open }),
      detail: t("reportsDetail", { today: reports.openToday }),
      href: `${adminRoutes.users}#reports`,
    },
    quota >= QUOTA_WARNING && today?.read != null && today.readLimit && {
      key: "quota",
      severity: "warning",
      icon: GaugeIcon,
      title: t("quota", { percent: format.number(quota, { style: "percent", maximumFractionDigits: 0 }) }),
      detail: t("quotaDetail", { used: format.number(today.read), limit: format.number(today.readLimit) }),
      href: adminRoutes.statistics,
    },
    system?.maintenance && {
      key: "maintenance",
      severity: "warning",
      icon: MegaphoneIcon,
      title: t("maintenance"),
      detail: t("maintenanceDetail"),
      href: adminRoutes.system,
    },
    system && !system.signupsEnabled && {
      key: "signups",
      severity: "warning",
      icon: BanIcon,
      title: t("signups"),
      detail: t("signupsDetail"),
      href: adminRoutes.system,
    },
    releaseNotes && releaseNotes.missing > 0 && {
      key: "releaseNotes",
      severity: "warning",
      icon: ReceiptTextIcon,
      title: t("releaseNotes", { count: releaseNotes.missing }),
      detail: t("releaseNotesDetail"),
      href: adminRoutes.releaseNotes,
    },
    commits?.status === "ok" && commits.undeployed !== null && commits.undeployed > 0 && {
      key: "undeployed",
      severity: "info",
      icon: GitBranchIcon,
      title: t("undeployed", { count: commits.undeployed }),
      detail: t("undeployedDetail"),
      href: adminRoutes.development,
    },
    users && users.suspended > 0 && {
      key: "suspended",
      severity: "info",
      icon: UserXIcon,
      title: t("suspended", { count: users.suspended }),
      detail: t("suspendedDetail"),
      href: adminRoutes.users,
    },
  ];
  const items = candidates
    .filter((item): item is AttentionItem => Boolean(item))
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-500/20 dark:text-emerald-300">
        <CircleCheckIcon className="size-5 shrink-0" aria-hidden />
        <span>
          <span className="font-medium">{t("clear")}</span> <span className="opacity-80">{t("clearDetail")}</span>
        </span>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="dashboard-attention">
      <h2 id="dashboard-attention" className="flex items-center gap-2 text-sm font-medium">
        {t("title")}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{items.length}</span>
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ key, severity, icon: Icon, title, detail, href }) => (
          <li key={key}>
            <Link
              href={href}
              className="group/item flex h-full items-start gap-3 rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10 transition-shadow hover:shadow-sm hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONES[severity])}>
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium">{title}</span>
                <span className="text-xs text-muted-foreground">{detail}</span>
              </span>
              <ArrowRightIcon className="mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover/item:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DashboardAttentionSkeleton() {
  return <Skeleton className="h-12 w-full rounded-xl" />;
}
