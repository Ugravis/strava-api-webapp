"use client";

import { CircleAlertIcon, ClockIcon, RefreshCwIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@kilotrace/ui/components/button";
import { Card, CardContent } from "@kilotrace/ui/components/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { isSyncActive, isTileWorkPending } from "@/hooks/use-strava-connection";
import type { SyncJob, TileProgress } from "@/lib/api/types";

interface StravaSyncStatusProps {
  sync: SyncJob | null;
  tiles: TileProgress | null;
  onRetry: () => void;
  retrying: boolean;
}

/**
 * Progress of a running synchronization and of the tile computation that
 * follows it, or the failure of the synchronization. Hidden once all is done.
 */
export function StravaSyncStatus({ sync, tiles, onRetry, retrying }: StravaSyncStatusProps) {
  const t = useTranslations("strava");
  const importing = isSyncActive(sync);
  const tilesPending = isTileWorkPending(tiles);

  const failure = sync?.status === "failed" && (
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

  if (!importing && !tilesPending) {
    return failure || null;
  }

  return (
    <>
      {failure}
      <Card aria-live="polite">
        <CardContent className="flex flex-col gap-4">
          {importing && sync && <ImportProgress sync={sync} />}
          {tilesPending && tiles && <TilesProgress tiles={tiles} />}
          <p className="text-xs text-muted-foreground">{t("sync.hint")}</p>
        </CardContent>
      </Card>
    </>
  );
}

function ImportProgress({ sync }: { sync: SyncJob }) {
  const t = useTranslations("strava");
  const format = useFormatter();

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
    <div className="flex flex-col gap-3">
      <Progress value={value}>
        <ProgressLabel>{sync.status === "running" ? t("sync.importing") : t("sync.queued")}</ProgressLabel>
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
    </div>
  );
}

/** First the tiles of every activity, then their refinement with full tracks. */
function TilesProgress({ tiles }: { tiles: TileProgress }) {
  const t = useTranslations("strava.sync.tiles");
  const computing = tiles.computed < tiles.activities;

  return (
    <div className="flex flex-col gap-1.5">
      <Progress value={computing && tiles.activities > 0 ? (tiles.computed / tiles.activities) * 100 : null}>
        <ProgressLabel>{computing ? t("computing") : t("refining")}</ProgressLabel>
        <span className="ml-auto text-sm text-muted-foreground tabular-nums">
          {computing
            ? t("computedCount", { computed: tiles.computed, total: tiles.activities })
            : t("refiningCount", { count: tiles.refining })}
        </span>
      </Progress>
      {!computing && <p className="text-sm text-muted-foreground">{t("refiningHint")}</p>}
    </div>
  );
}
