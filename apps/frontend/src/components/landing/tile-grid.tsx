/** Colors of the map (see the map style), so that the illustrations look like the app. */
export const MAP_COLORS = {
  tile: "#16a34a",
  smallTile: "#15803d",
  square: "#db2777",
  track: "#e11d48",
  water: "#4d77b2",
} as const;

interface TileGridProps {
  /** One string per row: "#" visited, "." not visited, "q" visited and part of the largest square. */
  rows: readonly string[];
  cell: number;
  gap: number;
  x?: number;
  y?: number;
  /** Class of the cells not visited yet, to follow the theme or a dark panel. */
  emptyClassName: string;
  /** Opacity of the visited cells, e.g. to show a past state of the map. */
  opacity?: (column: number, row: number) => number;
}

/** A grid of map tiles drawn in SVG, shared by the decorative illustrations. */
export function TileGrid({ rows, cell, gap, x = 0, y = 0, emptyClassName, opacity }: TileGridProps) {
  return (
    <g>
      {rows.flatMap((row, r) =>
        [...row].map((value, c) => {
          const visited = value !== ".";
          return (
            <rect
              key={`${c}-${r}`}
              x={x + c * (cell + gap)}
              y={y + r * (cell + gap)}
              width={cell}
              height={cell}
              rx={cell * 0.14}
              className={visited ? undefined : emptyClassName}
              fill={visited ? (value === "q" ? MAP_COLORS.square : MAP_COLORS.tile) : undefined}
              fillOpacity={visited ? (opacity?.(c, r) ?? 1) : undefined}
            />
          );
        }),
      )}
    </g>
  );
}
