"use client";

import { BanIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { SuspensionNotice as Notice } from "@/lib/api/types";
import { authService } from "@/services/auth.service";

/** Why the sign-in was refused to a suspended account, as told by the team. */
export function SuspensionNotice() {
  const t = useTranslations("auth.suspended");
  const format = useFormatter();
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    // Without the notice, e.g. once its cookie expired, the title alone is shown.
    authService.getSuspension().then(setNotice, () => setNotice(null));
  }, []);

  return (
    <Alert variant="destructive">
      <BanIcon />
      <AlertTitle>{t("title")}</AlertTitle>
      {notice && (
        <AlertDescription>
          <span className="block">
            {notice.until
              ? t("until", { date: format.dateTime(new Date(notice.until), { dateStyle: "long", timeStyle: "short" }) })
              : t("indefinite")}
          </span>
          {notice.reason && <span className="block">{t("reason", { reason: notice.reason })}</span>}
        </AlertDescription>
      )}
    </Alert>
  );
}
