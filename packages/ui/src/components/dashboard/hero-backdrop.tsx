import { cn } from "@kilotrace/ui/lib/utils";

/**
 * A grid of tiles crossed by a railway, fading toward the left: a nod to the
 * map. `tone` colors the tiles, green as on the map by default; `tiles` styles
 * the tiles only, `station` the inside of the stations, dark for a dark hero.
 */
export function HeroBackdrop({
  id = "dashboard-hero-tiles",
  tone = "text-green-500",
  tiles,
  station = "fill-zinc-900",
}: {
  id?: string;
  tone?: string;
  tiles?: string;
  station?: string;
}) {
  return (
    <svg
      aria-hidden
      className={cn("absolute inset-y-0 right-0 -z-10 h-full w-2/3 mask-[linear-gradient(to_left,black,transparent)]", tone)}
    >
      <defs>
        <pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse">
          <rect x="1" y="1" width="26" height="26" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.14" />
        </pattern>
      </defs>
      <g className={tiles}>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
        {HIGHLIGHTED.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x * 28 + 1} y={y * 28 + 1} width="26" height="26" rx="3" fill="currentColor" fillOpacity="0.16" />
        ))}
      </g>
      <g className="text-pink-500">
        <path d={RAILWAY} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="9" strokeLinecap="round" />
        <path d={RAILWAY} fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
        {STATIONS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5" className={station} stroke="currentColor" strokeWidth="2.5" />
        ))}
      </g>
    </svg>
  );
}

/** Railway of the backdrop, between the actions and the figures, and the stations along it. */
const RAILWAY = "M -20 30 C 120 30, 200 92, 340 92 S 560 66, 700 80 S 900 100, 1000 90";
const STATIONS: [number, number][] = [
  [340, 92],
  [700, 80],
];

/** Tiles of the backdrop shown as visited, counted from its top left. */
const HIGHLIGHTED: [number, number][] = [
  [9, 1], [10, 1], [8, 2], [9, 2], [10, 2], [11, 2], [9, 3], [10, 3], [12, 3], [10, 4], [11, 4], [11, 5], [12, 5], [13, 5], [6, 3], [7, 3],
];
