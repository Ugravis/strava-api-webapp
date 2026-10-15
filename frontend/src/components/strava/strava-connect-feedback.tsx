"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

const OUTCOMES = ["connected", "denied", "missing_scope", "already_linked", "unavailable", "error"] as const;
type Outcome = (typeof OUTCOMES)[number];

function isOutcome(value: string | null): value is Outcome {
  return (OUTCOMES as readonly (string | null)[]).includes(value);
}

/** Announces the result of the Strava authorization flow (`?strava=<outcome>`), then clears it. */
export function StravaConnectFeedback() {
  const t = useTranslations("strava.outcome");
  const router = useRouter();
  const pathname = usePathname();
  const outcome = useSearchParams().get("strava");

  useEffect(() => {
    if (!isOutcome(outcome)) return;
    if (outcome === "connected") {
      toast.success(t(outcome));
    } else {
      toast.error(t(outcome));
    }
    router.replace(pathname, { scroll: false });
  }, [outcome, pathname, router, t]);

  return null;
}
