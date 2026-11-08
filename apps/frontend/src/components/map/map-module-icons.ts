import { Grid2x2Icon, type LucideIcon, TrainFrontIcon } from "lucide-react";
import type { MapModule } from "./map-layers";

/** Icon of each module, in the band of the map and in the navigation. */
export const MAP_MODULE_ICONS: Record<MapModule, LucideIcon> = { tiles: Grid2x2Icon, stations: TrainFrontIcon };
