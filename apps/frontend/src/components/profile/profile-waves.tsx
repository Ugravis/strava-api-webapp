import { DEFAULT_PROFILE_COLOR } from "./profile-color";

const WIDTH = 400;
const HEIGHT = 200;
const WAVES = 5;

/** A wave across the box, its crests shifted from one wave to the next. */
function wavePath(index: number): string {
  const base = HEIGHT * (0.3 + index * 0.14);
  const amplitude = 14 + index * 3;
  const phase = index * 1.3;
  const points = Array.from({ length: 41 }, (_, step) => {
    const x = (step / 40) * WIDTH;
    const y = base + Math.sin((step / 40) * Math.PI * 2 + phase) * amplitude;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M0,${HEIGHT} L${points.join(" L")} L${WIDTH},${HEIGHT} Z`;
}

const PATHS = Array.from({ length: WAVES }, (_, index) => wavePath(index));

/**
 * Stands in for the showcase while it is turned off for the whole site: a
 * plain pattern in the hue of the profile, telling nothing of it. Paint is
 * set on the paths themselves, so that the card saved as an image keeps it.
 */
export function ProfileWaves({ color }: { color: string | null }) {
  const hue = color ?? DEFAULT_PROFILE_COLOR;
  return (
    <div className="relative min-h-40 flex-1 overflow-hidden border-t" aria-hidden>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
        {PATHS.map((path, index) => (
          <path key={path} d={path} fill={hue} fillOpacity={0.08 + index * 0.05} />
        ))}
      </svg>
    </div>
  );
}
