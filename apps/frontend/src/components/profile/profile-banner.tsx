import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const WIDTH = 600;
const HEIGHT = 180;
/** Contour lines around each summit, and points along each line. */
const LINES = 7;
const POINTS = 72;

/** Deterministic random numbers in [0, 1), from a seed (mulberry32). */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function hashOf(text: string): number {
  let hash = 2_166_136_261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16_777_619);
  return hash >>> 0;
}

/** Closed contour lines around two summits, wobbling the same way from one line to the next. */
function contours(seed: string): string[] {
  const random = seededRandom(hashOf(seed));
  const summits = [
    { x: WIDTH * (0.55 + random() * 0.35), y: HEIGHT * (0.2 + random() * 0.5), step: 22 + random() * 8 },
    { x: WIDTH * (0.05 + random() * 0.3), y: HEIGHT * (0.5 + random() * 0.6), step: 18 + random() * 8 },
  ];
  const paths: string[] = [];
  for (const { x, y, step } of summits) {
    const waves = [2, 3, 5].map((frequency) => ({ frequency, phase: random() * Math.PI * 2, amplitude: 0.05 + random() * 0.1 }));
    for (let line = 1; line <= LINES; line++) {
      const radius = line * step;
      const points = Array.from({ length: POINTS }, (_, index) => {
        const angle = (index / POINTS) * Math.PI * 2;
        const wobble = waves.reduce(
          (total, wave) => total + wave.amplitude * Math.sin(wave.frequency * angle + wave.phase + line * 0.15),
          1,
        );
        return `${(x + Math.cos(angle) * radius * wobble * 1.6).toFixed(1)},${(y + Math.sin(angle) * radius * wobble).toFixed(1)}`;
      });
      paths.push(`M${points.join("L")}Z`);
    }
  }
  return paths;
}

/** Banner of a profile: contour lines of an imaginary relief, its own for each user, on the hue of the profile. */
export function ProfileBanner({ seed, style, className }: { seed: string; style: CSSProperties; className?: string }) {
  return (
    <div aria-hidden className={cn("relative isolate overflow-hidden", className)} style={style}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full text-white"
      >
        {contours(seed).map((path, index) => (
          <path
            key={index}
            d={path}
            fill="none"
            stroke="currentColor"
            strokeOpacity={index % LINES === LINES - 1 ? 0.12 : 0.22}
            strokeWidth={index % LINES === 0 ? 1.5 : 1}
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div className="absolute inset-0 bg-linear-to-t from-black/25 to-transparent" />
    </div>
  );
}
