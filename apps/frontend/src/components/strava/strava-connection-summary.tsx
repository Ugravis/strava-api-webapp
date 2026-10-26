"use client";

import { InfoIcon, RefreshCwIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@kilotrace/ui/components/button";
import type { StravaConnectionStatus } from "@/lib/api/types";
import { StravaIcon } from "./strava-icon";

type Connection = NonNullable<StravaConnectionStatus["connection"]>;

interface StravaConnectionSummaryProps {
  connection: Connection;
  syncing: boolean;
  onSync: () => void;
}

/** Connected account, last synchronization and a manual sync action. */
export function StravaConnectionSummary({ connection, syncing, onSync }: StravaConnectionSummaryProps) {
  const t = useTranslations("strava.sync");
  const format = useFormatter();
  // Reference time of the relative date, refreshed so that it stays accurate.
  const now = useNow({ updateInterval: 60_000 });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2 text-sm text-muted-foreground">
          <StravaIcon className="mt-0.5 size-4 shrink-0 text-[#fc4c02]" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate">
              {connection.accountName
                ? t("connectedAs", { name: connection.accountName })
                : t("connected")}
            </span>
            <span>
              {connection.lastSyncedAt
                ? t("lastSynced", { date: format.relativeTime(new Date(connection.lastSyncedAt), now) })
                : t("neverSynced")}
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={onSync} disabled={syncing} className="w-full sm:w-auto">
          <RefreshCwIcon className={syncing ? "animate-spin" : undefined} />
          {t("now")}
        </Button>
      </div>
      {!connection.privateActivitiesGranted && (
        <Alert>
          <InfoIcon />
          <AlertDescription>{t("privateMissing")}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
