import { useFormatter, useTranslations } from "next-intl";
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
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className="text-base font-semibold tracking-tight">
          {t(`families.${family}`)}
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {t("familyTotal", {
            distance: format.number(totalM / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 0 }),
          })}
        </p>
      </div>
      <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
        {landmarks.map((landmark) => (
          <LandmarkBadge key={landmark.id} landmark={landmark} />
        ))}
      </ul>
    </section>
  );
}
