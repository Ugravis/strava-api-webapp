import type { CSSProperties } from "react";
import type { AppVariant } from "@kilotrace/ui/components/brand/app-logo";
import { cn } from "@kilotrace/ui/lib/utils";

/** Digits as 3 × 5 tiles, "#" visited. */
const GLYPHS: Record<string, readonly string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
};

/** Colours of the map: green tiles on the site, blue in the back office; the track in red. */
const ACCENT: Record<AppVariant, string> = { site: "#16a34a", admin: "#2563eb" };
const TRACK = "#e11d48";

const CELL = 28;
const GAP = 6;
const STEP = CELL + GAP;
/** One empty tile around the digits, and one between them. */
const PAD = 1;

interface TileCodeProps {
  /** Digits of the status code, e.g. "404". */
  code: string;
  /** Index of a digit drawn as tiles still to visit, dashed: the part off the map. */
  ghost?: number;
  variant?: AppVariant;
  className?: string;
}

/** A status code drawn as map tiles that pop in, crossed by a track. */
export function TileCode({ code, ghost, variant = "site", className }: TileCodeProps) {
  const digits = [...code].filter((digit) => digit in GLYPHS);
  const columns = digits.length * 4 - 1 + PAD * 2;
  const rows = 5 + PAD * 2;
  const width = columns * STEP - GAP;
  const height = rows * STEP - GAP;
  const accent = ACCENT[variant];

  const tiles = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: columns }, (_, c) => {
      const column = c - PAD;
      const index = Math.floor(column / 4);
      const glyph = column >= 0 && column % 4 < 3 ? GLYPHS[digits[index] ?? ""] : undefined;
      const visited = glyph?.[r - PAD]?.[column % 4] === "#";
      return { c, r, visited, ghost: visited && index === ghost };
    }),
  ).flat();

  const bottom = height - CELL / 2;
  const track = `M${CELL / 2} ${bottom - 10} C ${width * 0.2} ${bottom + 14}, ${width * 0.35} ${bottom - 22}, ${width * 0.5} ${bottom - 4} S ${width * 0.8} ${bottom + 12}, ${width - CELL / 2} ${bottom - 18}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={code} className={cn("block h-auto w-full", className)}>
      {tiles.map(({ c, r, visited, ghost: dashed }) => (
        <rect
          key={`${c}-${r}`}
          x={c * STEP}
          y={r * STEP}
          width={CELL}
          height={CELL}
          rx={CELL * 0.14}
          className={cn(
            "origin-center [transform-box:fill-box]",
            visited ? "animate-tile-pop motion-reduce:animate-none" : "fill-foreground/[0.05]",
          )}
          style={visited ? ({ animationDelay: `${c * 45 + r * 25}ms` } as CSSProperties) : undefined}
          fill={visited && !dashed ? accent : undefined}
          fillOpacity={dashed ? 0 : undefined}
          stroke={dashed ? accent : undefined}
          strokeWidth={dashed ? 2 : undefined}
          strokeDasharray={dashed ? "5 4" : undefined}
        />
      ))}
      <path
        d={track}
        pathLength={1}
        fill="none"
        stroke={TRACK}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="1 1"
        className="animate-track-draw motion-reduce:animate-none"
      />
      <circle cx={CELL / 2} cy={bottom - 10} r={6} fill={TRACK} />
      <circle cx={width - CELL / 2} cy={bottom - 18} r={6} className="fill-background" stroke={TRACK} strokeWidth={3} />
    </svg>
  );
}
