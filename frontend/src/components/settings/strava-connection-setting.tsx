"use client";

import { UnplugIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { StravaConnectButton } from "@/components/strava/strava-connect-button";
import { StravaIcon } from "@/components/strava/strava-icon";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStravaConnection } from "@/hooks/use-strava-connection";
import { errorCodeOf } from "@/lib/api/errors";
import { stravaService } from "@/services/strava.service";
import { ConnectionSettingSkeleton } from "./connection-setting-skeleton";

export function StravaConnectionSetting() {
  const t = useTranslations();
  const format = useFormatter();
  const { status, error, refresh } = useStravaConnection();
  const [open, setOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  if (!status) {
    return error ? (
      <p className="text-sm text-muted-foreground">{t("strava.statusError")}</p>
    ) : (
      <ConnectionSettingSkeleton />
    );
  }

  const { connection } = status;
  const connectedSince = connection
    ? format.dateTime(new Date(connection.connectedAt), { dateStyle: "long" })
    : "";

  async function revoke() {
    setRevoking(true);
    try {
      await stravaService.disconnect();
      toast.success(t("settings.connections.revoked"));
      setOpen(false);
      await refresh();
    } catch (failure) {
      toast.error(t(`errors.${errorCodeOf(failure)}`));
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#fc4c02]/10 text-[#fc4c02]">
          <StravaIcon className="size-5" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-medium">{t("strava.name")}</span>
            <Badge variant={connection ? "secondary" : "outline"}>
              {connection ? t("settings.connections.connected") : t("settings.connections.notConnected")}
            </Badge>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {connection
              ? connection.accountName
                ? t("settings.connections.connectedAs", { name: connection.accountName, date: connectedSince })
                : t("settings.connections.connectedSince", { date: connectedSince })
              : status.available
                ? t("settings.connections.notConnectedDescription")
                : t("strava.unavailable")}
          </p>
        </div>
      </div>

      {connection ? (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger render={<Button variant="outline" className="w-full sm:w-auto" />}>
            <UnplugIcon />
            {t("settings.connections.revoke")}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("settings.connections.revokeTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("settings.connections.revokeDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={revoking}>{t("common.cancel")}</AlertDialogCancel>
              <Button variant="destructive" onClick={() => void revoke()} disabled={revoking}>
                {t("settings.connections.revokeConfirm")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        status.available && <StravaConnectButton from="settings" className="w-full sm:w-auto" />
      )}
    </div>
  );
}
