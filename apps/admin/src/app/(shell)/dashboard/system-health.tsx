import type { ReactNode } from "react";
import { formatRelative } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { cn } from "@kilotrace/ui/lib/utils";
import { dashboardData } from "./data";
import { DashboardCard, DashboardUnavailable } from "./parts";

type Tone = "ok" | "warning" | "critical" | "neutral";

const DOTS: Record<Tone, string> = {
  ok: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-destructive",
  neutral: "bg-muted-foreground/40",
};

/** A line of the health card: a name, a dot of its state, its value. */
function HealthRow({ label, tone, children }: { label: string; tone?: Tone; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 font-medium">
        {tone && <span className={cn("size-2 shrink-0 rounded-full", DOTS[tone])} aria-hidden />}
        <span className="truncate">{children}</span>
      </dd>
    </div>
  );
}

/** Where the running app stands: build, database, deployment, switches of the site; the version is in the hero. */
export async function DashboardSystemHealth() {
  const t = getAdminTranslations("dashboard.system");
  const [dev, commits, system] = await Promise.all([dashboardData.dev(), dashboardData.commits(), dashboardData.system()]);
  if (!dev && !system) {
    return (
      <DashboardCard title={t("title")} href={adminRoutes.dev}>
        <DashboardUnavailable />
      </DashboardCard>
    );
  }
  return (
    <DashboardCard title={t("title")} href={adminRoutes.dev}>
      <dl className="flex flex-col divide-y">
        {dev && (
          <>
            <HealthRow label={t("environment")}>{dev.environment}</HealthRow>
            <HealthRow label={t("commit")}>
              <code className="font-mono text-xs">{dev.commit?.slice(0, 7) ?? t("unknown")}</code>
            </HealthRow>
            <HealthRow label={t("migrations")} tone={dev.pending.length > 0 ? "critical" : "ok"}>
              {dev.pending.length > 0 ? t("migrationsPending", { count: dev.pending.length }) : t("migrationsOk")}
            </HealthRow>
          </>
        )}
        {commits && (
          <HealthRow label={t("deployment")} tone={commits.status !== "ok" || commits.undeployed === null ? "neutral" : commits.undeployed > 0 ? "warning" : "ok"}>
            {commits.status !== "ok" || commits.undeployed === null
              ? t("unknown")
              : commits.undeployed > 0
                ? t("deploymentLate", { count: commits.undeployed })
                : t("deploymentOk")}
          </HealthRow>
        )}
        {system && (
          <>
            <HealthRow label={t("maintenance")} tone={system.maintenance ? "warning" : "ok"}>
              {system.maintenance ? t("maintenanceOn", { since: formatRelative(system.maintenance.since) }) : t("maintenanceOff")}
            </HealthRow>
            <HealthRow label={t("signups")} tone={system.signupsEnabled ? "ok" : "warning"}>
              {system.signupsEnabled ? t("signupsOn") : t("signupsOff")}
            </HealthRow>
          </>
        )}
      </dl>
    </DashboardCard>
  );
}
