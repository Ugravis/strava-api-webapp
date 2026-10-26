import { useFormatter, useTranslations } from "next-intl";
import { useAmount } from "./use-amount";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DistanceBadge, DistanceBadgeDetails } from "@/lib/api/types";

interface BadgeFactsProps {
  badge: DistanceBadge;
  /** Null while loading or after a failure. */
  details: DistanceBadgeDetails | null;
  error: boolean;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{children}</dd>
    </div>
  );
}

/** Key figures of a badge: completions, their dates, and the way to the next one. */
export function BadgeFacts({ badge, details, error }: BadgeFactsProps) {
  const t = useTranslations("distances.dialog.facts");
  const format = useFormatter();
  const amount = useAmount();
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium" });

  return (
    <dl className="grid grid-cols-2 gap-2">
      {badge.tiers ? (
        <Fact label={t("tierReached")}>{t("tierValue", { level: badge.completions, total: badge.tiers.length })}</Fact>
      ) : (
        <Fact label={t("completions")}>{t("completionsValue", { count: badge.completions })}</Fact>
      )}
      <Fact label={t("remaining")}>
        {badge.progress >= 1 ? t("done") : amount(badge.metric, badge.goal - badge.covered)}
      </Fact>
      <Fact label={t("firstCompletedAt")}>{badge.firstCompletedAt ? date(badge.firstCompletedAt) : t("never")}</Fact>
      {badge.completions > 1 && badge.lastCompletedAt && (
        <Fact label={t("lastCompletedAt")}>{date(badge.lastCompletedAt)}</Fact>
      )}
      <Fact label={t("estimatedNext")}>
        {details ? (
          details.estimatedNextAt ? (
            <span title={t("estimateHint")}>{date(details.estimatedNextAt)}</span>
          ) : (
            <span className="font-normal text-muted-foreground">{t("noRecentActivity")}</span>
          )
        ) : error ? (
          <span className="font-normal text-muted-foreground">{t("unavailable")}</span>
        ) : (
          <Skeleton className="my-0.5 h-4 w-24" />
        )}
      </Fact>
    </dl>
  );
}
