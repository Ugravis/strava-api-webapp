"use client";

import { CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StravaConnectCard } from "@/components/strava/strava-connect-card";
import { StravaConnectionSummary } from "@/components/strava/strava-connection-summary";
import { StravaSyncStatus } from "@/components/strava/strava-sync-status";
import { useRequestSync } from "@/components/strava/use-request-sync";
import { isSyncActive, useStravaConnection } from "@/hooks/use-strava-connection";
import { ActivityStats } from "./activity-stats";
import { CountryStats } from "./country-stats";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { TileStats } from "./tile-stats";

/** Main page: Strava connection, import progress and first metrics. */
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
    return status.available ? (
      <StravaConnectCard from="dashboard" />
    ) : (
      <Alert>
        <CircleAlertIcon />
        <AlertDescription>{t("unavailable")}</AlertDescription>
      </Alert>
    );
  }

  const { sync, tiles } = status;
  const syncing = pending || isSyncActive(sync);
  // Totals follow the import while it runs, then its final state.
  const statsVersion = `${sync?.status ?? "none"}:${sync?.processed ?? 0}`;
  const tilesVersion = `${tiles?.computed ?? 0}:${tiles?.refining ?? 0}`;

  return (
    <div className="flex flex-col gap-4">
      <StravaSyncStatus sync={sync} tiles={tiles} onRetry={() => void requestSync()} retrying={pending} />
      <ActivityStats version={statsVersion} />
      <TileStats version={tilesVersion} />
      <CountryStats version={tilesVersion} />
      <StravaConnectionSummary
        connection={status.connection}
        syncing={syncing}
        onSync={() => void requestSync()}
      />
    </div>
  );
}
