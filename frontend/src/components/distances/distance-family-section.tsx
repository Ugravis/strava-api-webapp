import { useFormatter, useTranslations } from "next-intl";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DistanceFamily, LandmarkProgress } from "@/lib/api/types";
import { LandmarkBadge } from "./landmark-badge";

interface DistanceFamilySectionProps {
  family: DistanceFamily;
  totalM: number;
  landmarks: LandmarkProgress[];
}

/** Landmarks of a family of sports, with the distance it accumulates. */
export function DistanceFamilySection({ family, totalM, landmarks }: DistanceFamilySectionProps) {
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
          <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
            {landmarks.map((landmark) => (
              <LandmarkBadge key={landmark.id} landmark={landmark} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
