import {
  ActivityIcon,
  BikeIcon,
  FootprintsIcon,
  type LucideIcon,
  type LucideProps,
  SportShoeIcon,
  WavesIcon,
} from "lucide-react";
import { createElement } from "react";
import type { DistanceFamily } from "@/lib/api/types";

const FAMILY_ICONS: Record<DistanceFamily, LucideIcon> = {
  all: ActivityIcon,
  run: SportShoeIcon,
  hike: FootprintsIcon,
  ride: BikeIcon,
  swim: WavesIcon,
};

/** Icon of a family of sports. */
export function FamilyIcon({ family, ...props }: LucideProps & { family: DistanceFamily }) {
  return createElement(FAMILY_ICONS[family], props);
}
