"use client";

import { CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@kilotrace/ui/components/button";
import { Skeleton } from "@kilotrace/ui/components/skeleton";
import { StravaConnectCard } from "@/components/strava/strava-connect-card";
import { StravaConnectionSummary } from "@/components/strava/strava-connection-summary";
import { StravaSyncStatus } from "@/components/strava/strava-sync-status";
import { useRequestSync } from "@/components/strava/use-request-sync";
import { useActivitiesOverview } from "@/hooks/use-activities-overview";
import { useActivityStats } from "@/hooks/use-activity-stats";
import { isSyncActive, useStravaConnection } from "@/hooks/use-strava-connection";
import type { StravaConnectionStatus } from "@/lib/api/types";
import { ActivityCalendar } from "./activity-calendar";
import { BadgesHighlight } from "./badges-highlight";
import { DashboardHero } from "./dashboard-hero";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { StationsEvolution, TilesEvolution } from "./evolution-cards";
import { ExplorationCard } from "./exploration-card";
import { MonthlyDistance } from "./monthly-distance";
import { RecentActivities } from "./recent-activities";
import { SportBreakdown } from "./sport-breakdown";
import { WeekCard } from "./week-card";

/** Home page of the user: their week, their year, their latest activities, their exploration and their badges. */
export function Dashboard() {
  const t = useTranslations("strava");
  const { status, error, refresh, update } = useStravaConnection();
  const { requestSync, pending } = useRequestSync(update);

  if (!status) {
    return error ? (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertDescription>{t("statusError")}</AlertDescription>
        <AlertAction>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>
            <RefreshCwIcon />
            {t("retry")}
          </Button>
        </AlertAction>
      </Alert>
    ) : (
      <DashboardSkeleton />
    );
  }

  if (!status.connection) {
    return (
      <div className="flex flex-col gap-4">
        <DashboardHero stats={null} overview={null} welcome />
        {status.available ? (
          <StravaConnectCard from="dashboard" />
        ) : (
          <Alert>
            <CircleAlertIcon />
            <AlertDescription>{t("unavailable")}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <ConnectedDashboard
      status={status}
      connection={status.connection}
      pending={pending}
      requestSync={requestSync}
    />
  );
}

interface ConnectedDashboardProps {
  status: StravaConnectionStatus;
  connection: NonNullable<StravaConnectionStatus["connection"]>;
  pending: boolean;
  requestSync: () => Promise<unknown>;
}

function ConnectedDashboard({ status, connection, pending, requestSync }: ConnectedDashboardProps) {
  const { sync, tiles } = status;
  const syncing = pending || isSyncActive(sync);
  // Totals follow the import while it runs, then its final state.
  const statsVersion = `${sync?.status ?? "none"}:${sync?.processed ?? 0}`;
  const tilesVersion = `${tiles?.computed ?? 0}:${tiles?.refining ?? 0}`;

  const { stats } = useActivityStats(statsVersion);
  const { overview } = useActivitiesOverview(statsVersion);

  return (
    <div className="flex flex-col gap-4">
      <StravaSyncStatus sync={sync} tiles={tiles} onRetry={() => void requestSync()} retrying={pending} />
      <DashboardHero stats={stats} overview={overview} />
      <div className="grid gap-4 lg:grid-cols-3">
        <WeekCard days={overview?.days ?? null} />
        <SportBreakdown sports={overview?.sports ?? null} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {overview ? (
          <ActivityCalendar
            firstActivityAt={overview.firstActivityAt}
            version={statsVersion}
            className="lg:col-span-2"
          />
        ) : (
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        )}
        <ExplorationCard version={tilesVersion} />
        <RecentActivities activities={overview?.recent ?? null} />
      </div>
      <BadgesHighlight />
      <TilesEvolution version={tilesVersion} />
      <StationsEvolution version={tilesVersion} />
      <MonthlyDistance version={statsVersion} />
      <div className="rounded-xl border border-dashed p-4">
        <StravaConnectionSummary
          connection={connection}
          syncing={syncing}
          onSync={() => void requestSync()}
        />
      </div>
    </div>
  );
}
