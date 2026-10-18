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

/** Icons by the key the catalog of badges gives. */
const BADGE_ICONS: Record<string, LucideIcon> = {
  pickaxe: PickaxeIcon,
  earth: EarthIcon,
  moon: MoonIcon,
  car: CarIcon,
  medal: MedalIcon,
  waves: WavesIcon,
  mountain: MountainIcon,
  shell: ShellIcon,
  hexagon: HexagonIcon,
  "tree-pine": TreePineIcon,
  bike: BikeIcon,
  "train-front": TrainFrontIcon,
  route: RouteIcon,
};

/** Icon of a badge; keys unknown to this version of the app get a generic one. */
export function BadgeIcon({ icon, ...props }: LucideProps & { icon: string }) {
  return createElement(BADGE_ICONS[icon] ?? MilestoneIcon, props);
}
