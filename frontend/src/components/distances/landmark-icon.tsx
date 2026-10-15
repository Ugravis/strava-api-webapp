import {
  BikeIcon,
  CarIcon,
  EarthIcon,
  HexagonIcon,
  MedalIcon,
  MilestoneIcon,
  MountainIcon,
  MoonIcon,
  PickaxeIcon,
  RouteIcon,
  ShellIcon,
  TrainFrontIcon,
  TreePineIcon,
  WavesIcon,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { createElement } from "react";

const LANDMARK_ICONS: Record<string, LucideIcon> = {
  earth_center: PickaxeIcon,
  earth_circumference: EarthIcon,
  earth_moon: MoonIcon,
  paris_ring_road: CarIcon,
  marathon: MedalIcon,
  lake_geneva: WavesIcon,
  gr20: MountainIcon,
  camino_vezelay: ShellIcon,
  hexatrek: HexagonIcon,
  pacific_crest_trail: TreePineIcon,
  tour_de_france: BikeIcon,
  trans_siberian: TrainFrontIcon,
  pan_american_highway: RouteIcon,
};

/** Icon symbolizing a landmark; landmarks added by the server get a generic one. */
export function LandmarkIcon({ id, ...props }: LucideProps & { id: string }) {
  return createElement(LANDMARK_ICONS[id] ?? MilestoneIcon, props);
}
