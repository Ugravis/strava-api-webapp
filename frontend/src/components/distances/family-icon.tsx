import { ActivityIcon, BackpackIcon, BikeIcon, FootprintsIcon, type LucideIcon, type LucideProps } from "lucide-react";
import { createElement } from "react";
import type { DistanceFamily } from "@/lib/api/types";

const FAMILY_ICONS: Record<DistanceFamily, LucideIcon> = {
  all: ActivityIcon,
  run: FootprintsIcon,
  hike: BackpackIcon,
  ride: BikeIcon,
};

/** Icon of a family of sports. */
export function FamilyIcon({ family, ...props }: LucideProps & { family: DistanceFamily }) {
  return createElement(FAMILY_ICONS[family], props);
}
