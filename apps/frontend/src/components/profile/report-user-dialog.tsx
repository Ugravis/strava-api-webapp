"use client";

import { USER_REPORT_CUSTOM_REASON, USER_REPORT_DETAILS_MAX_LENGTH, USER_REPORT_REASONS, type UserReportReason } from "@kilotrace/shared";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@kilotrace/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kilotrace/ui/components/ui/dialog";
import { Label } from "@kilotrace/ui/components/ui/label";
import { Textarea } from "@kilotrace/ui/components/ui/textarea";
import { errorCodeOf } from "@/lib/api/errors";
import { profilesService } from "@/services/profiles.service";

interface ReportUserDialogProps {
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReported: () => void;
}

/** Reports a profile to the team: a reason picked, or told in the text for a custom one. */
export function ReportUserDialog({ username, open, onOpenChange, onReported }: ReportUserDialogProps) {
  const t = useTranslations("profile.report");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [reason, setReason] = useState<UserReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const custom = reason === USER_REPORT_CUSTOM_REASON;
  const ready = reason !== null && (!custom || details.trim().length > 0);

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setReason(null);
      setDetails("");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setPending(true);
    try {
      await profilesService.report(username, { reason, details: details.trim() || null });
      onReported();
      close(false);
    } catch (error) {
      const code = errorCodeOf(error);
      toast.error(tErrors(code));
      if (code === "ALREADY_REPORTED") {
        onReported();
        close(false);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { username })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
          <fieldset className="-mx-2 flex flex-col">
            <legend className="sr-only">{t("reasons.legend")}</legend>
            {USER_REPORT_REASONS.map((value) => (
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
            <Label htmlFor="report-details">{t(custom ? "detailsRequired" : "details")}</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={t(custom ? "customPlaceholder" : "detailsPlaceholder")}
              maxLength={USER_REPORT_DETAILS_MAX_LENGTH}
              required={custom}
              rows={3}
            />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{t("warning")}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={!ready || pending}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
