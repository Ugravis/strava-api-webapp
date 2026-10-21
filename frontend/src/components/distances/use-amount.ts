import { useTranslations } from "next-intl";
import { useFormatter } from "next-intl";
import type { BadgeMetric } from "@/lib/api/types";
import { formatAmount } from "@/lib/badge-amount";

/** Formats an amount of a metric with its unit, in the language of the user. */
export function useAmount(): (metric: BadgeMetric, value: number) => string {
  const t = useTranslations("distances.units");
  const format = useFormatter();
  return (metric, value) =>
    formatAmount(
      {
        number: (amount, options) => format.number(amount, options),
        count: (counted, amount) => t(counted, { count: amount }),
      },
      metric,
      value,
    );
}
