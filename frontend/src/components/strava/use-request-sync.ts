"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { errorCodeOf } from "@/lib/api/errors";
import type { StravaConnectionStatus } from "@/lib/api/types";
import { stravaService } from "@/services/strava.service";

/** Asks for a synchronization now and hands the new status over. */
export function useRequestSync(onStatus: (status: StravaConnectionStatus) => void) {
  const t = useTranslations();
  const [pending, setPending] = useState(false);

  async function requestSync() {
    setPending(true);
    try {
      onStatus(await stravaService.requestSync());
      toast.success(t("strava.sync.requested"));
    } catch (error) {
      toast.error(t(`errors.${errorCodeOf(error)}`));
    } finally {
      setPending(false);
    }
  }

  return { requestSync, pending };
}
