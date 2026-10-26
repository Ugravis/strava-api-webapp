import {
  ActivityIcon,
  BikeIcon,
  DumbbellIcon,
  FootprintsIcon,
  type LucideIcon,
  MountainIcon,
  SailboatIcon,
  SnowflakeIcon,
  WavesIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  run: FootprintsIcon,
  trail_run: FootprintsIcon,
  virtual_run: FootprintsIcon,
  walk: FootprintsIcon,
  hike: MountainIcon,
  snowshoe: MountainIcon,
  ride: BikeIcon,
  gravel_ride: BikeIcon,
  mountain_bike_ride: BikeIcon,
  e_bike_ride: BikeIcon,
  e_mountain_bike_ride: BikeIcon,
  virtual_ride: BikeIcon,
  handcycle: BikeIcon,
  swim: WavesIcon,
  alpine_ski: SnowflakeIcon,
  backcountry_ski: SnowflakeIcon,
  nordic_ski: SnowflakeIcon,
  snowboard: SnowflakeIcon,
  rowing: SailboatIcon,
  kayaking: SailboatIcon,
  canoeing: SailboatIcon,
  stand_up_paddling: SailboatIcon,
  workout: DumbbellIcon,
};

/** Icon of a sport; a generic one for the others. */
export function SportIcon({ sportType, className }: { sportType: string; className?: string }) {
  const Icon = ICONS[sportType] ?? ActivityIcon;
  return <Icon className={className} aria-hidden />;
}
