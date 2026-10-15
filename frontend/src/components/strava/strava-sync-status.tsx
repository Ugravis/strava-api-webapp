"use client";

import { CircleAlertIcon, ClockIcon, RefreshCwIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import type { SyncJob } from "@/lib/api/types";

interface StravaSyncStatusProps {
  sync: SyncJob;
  onRetry: () => void;
  retrying: boolean;
}

/** Progress of a running synchronization, or its failure. Hidden once completed. */
export function StravaSyncStatus({ sync, onRetry, retrying }: StravaSyncStatusProps) {
  const t = useTranslations("strava");
  const format = useFormatter();

  if (sync.status === "completed") {
    return null;
  }

  if (sync.status === "failed") {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>{t("sync.failed")}</AlertTitle>
        <AlertDescription>{t("sync.failedDescription")}</AlertDescription>
        <AlertAction>
          <Button size="sm" variant="outline" onClick={onRetry} disabled={retrying}>
            <RefreshCwIcon />
            {t("retry")}
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  const waitingTime = sync.waitingUntil
    ? format.dateTime(new Date(sync.waitingUntil), { hour: "2-digit", minute: "2-digit" })
    : null;
  const waitingMessage =
    waitingTime &&
    (sync.errorCode === "RATE_LIMITED"
      ? t("sync.rateLimited", { time: waitingTime })
      : t("sync.retrying", { time: waitingTime }));
  // The total is only known at the end: the bar is indeterminate meanwhile.
  const value = sync.total ? (sync.processed / sync.total) * 100 : null;

  return (
    <Card aria-live="polite">
      <CardContent className="flex flex-col gap-3">
        <Progress value={value}>
          <ProgressLabel>
            {sync.status === "running" ? t("sync.importing") : t("sync.queued")}
          </ProgressLabel>
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {t("sync.importingCount", { count: sync.processed })}
          </span>
        </Progress>
        {waitingMessage && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <ClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            {waitingMessage}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{t("sync.hint")}</p>
      </CardContent>
    </Card>
  );
}
