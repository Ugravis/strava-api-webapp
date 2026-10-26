import { CheckIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { DistanceBadge } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useAmount } from "./use-amount";

/** Every tier of a tiered badge, those reached checked and the next one with its progress. */
export function BadgeTiers({ badge, tiers }: { badge: DistanceBadge; tiers: number[] }) {
  const t = useTranslations("distances.dialog.tiers");
  const format = useFormatter();
  const amount = useAmount();
  const headingId = "badge-tiers";

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-xs font-medium text-muted-foreground uppercase">
        {t("title")}
      </h3>
      <ol className="flex flex-col gap-1">
        {tiers.map((target, index) => {
          const reached = index < badge.completions;
          const next = index === badge.completions;
          return (
            <li
              key={target}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm",
                reached ? "bg-primary/10" : next ? "ring-1 ring-primary/40" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold tabular-nums",
                  reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {reached ? <CheckIcon className="size-3" aria-hidden /> : index + 1}
              </span>
              <span className="flex-1">{t("tier", { number: index + 1 })}</span>
              <span className="tabular-nums">{amount(badge.metric, target)}</span>
              <span className="sr-only">
                {reached
                  ? t("reached")
                  : next
                    ? format.number(Math.floor(badge.progress * 100) / 100, { style: "percent" })
                    : t("locked")}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
