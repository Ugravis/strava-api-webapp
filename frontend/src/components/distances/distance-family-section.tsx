import { useFormatter, useTranslations } from "next-intl";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DistanceBadge, DistanceFamily } from "@/lib/api/types";
import { BadgeGrid } from "./badge-grid";

interface DistanceFamilySectionProps {
  family: DistanceFamily;
  totalM: number;
  badges: DistanceBadge[];
  onOpen: (badgeId: string) => void;
}

/** Badges of a family of sports, with the distance it accumulates. */
export function DistanceFamilySection({ family, totalM, badges, onOpen }: DistanceFamilySectionProps) {
  const t = useTranslations("distances");
  const format = useFormatter();
  const headingId = `distances-${family}`;

  return (
    <section aria-labelledby={headingId}>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 id={headingId}>{t(`families.${family}`)}</h2>
          </CardTitle>
          <CardAction className="text-sm text-muted-foreground tabular-nums">
            {t("familyTotal", {
              distance: format.number(totalM / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 0 }),
            })}
          </CardAction>
        </CardHeader>
        <CardContent>
          <BadgeGrid badges={badges} onOpen={onOpen} />
        </CardContent>
      </Card>
    </section>
  );
}
