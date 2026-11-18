"use client";

import { STATION_REPORT_CUSTOM_REASON, STATION_REPORT_DETAILS_MAX_LENGTH, STATION_REPORT_GENERAL_REASONS, STATION_REPORT_STATION_REASONS, type StationReportReason } from "@kilotrace/shared";
import { CircleCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@kilotrace/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kilotrace/ui/components/ui/dialog";
import { Label } from "@kilotrace/ui/components/ui/label";
import { Textarea } from "@kilotrace/ui/components/ui/textarea";
import { errorCodeOf } from "@/lib/api/errors";
import { stationsService } from "@/services/stations.service";

interface ReportStationDialogProps {
  /** The station reported from its panel; none from the band, for a station missing or the railway. */
  station?: { id: number; name: string | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Tells the team about railway data missing or wrong: a reason picked, or told in the text for a custom one. */
export function ReportStationDialog({ station, open, onOpenChange }: ReportStationDialogProps) {
  const t = useTranslations("map.stationReport");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [reason, setReason] = useState<StationReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Sent: the dialog tells it, until closed. */
  const [sent, setSent] = useState(false);
  const reasons = station ? STATION_REPORT_STATION_REASONS : STATION_REPORT_GENERAL_REASONS;
  const custom = reason === STATION_REPORT_CUSTOM_REASON;
  const ready = reason !== null && (!custom || details.trim().length > 0);

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setReason(null);
      setDetails("");
      setError(null);
      setSent(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setPending(true);
    setError(null);
    try {
      await stationsService.report({ reason, details: details.trim() || null, stationId: station?.id ?? null });
      setSent(true);
    } catch (failure) {
      setError(tErrors(errorCodeOf(failure)));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CircleCheckIcon className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {t("sent")}
              </DialogTitle>
              <DialogDescription>{t("sentDescription")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={() => close(false)}>
                {t("close")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{station ? t("stationTitle", { name: station.name ?? t("unnamed") }) : t("title")}</DialogTitle>
              <DialogDescription>{t(station ? "stationDescription" : "description")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
              <fieldset className="-mx-2 flex flex-col">
                <legend className="sr-only">{t("legend")}</legend>
                {reasons.map((value) => (
                  <label
                    key={value}
                    className="flex min-h-9 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted has-checked:bg-muted has-focus-visible:ring-2 has-focus-visible:ring-ring"
                  >
                    <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="size-4 shrink-0 accent-primary" />
                    {t(`reasons.${value}`)}
                  </label>
                ))}
              </fieldset>
              <div className="flex flex-col gap-2">
                <Label htmlFor="station-report-details">{t(custom ? "detailsRequired" : "details")}</Label>
                <Textarea
                  id="station-report-details"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder={t(custom ? "customPlaceholder" : station ? "stationPlaceholder" : "detailsPlaceholder")}
                  maxLength={STATION_REPORT_DETAILS_MAX_LENGTH}
                  required={custom}
                  rows={3}
                />
              </div>
              {error && (
                <p role="alert" className="-mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => close(false)}>
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={!ready || pending}>
                  {t("submit")}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
