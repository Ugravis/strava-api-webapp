import { MAP_COLORS, TileGrid } from "./tile-grid";

/**
 * Decorative illustrations of the carousel, drawn for its dark background.
 * Same 320 × 200 frame for all, so that the slides line up.
 */
const EMPTY = "fill-white/[0.06]";
const LABEL = "fill-white/60 text-[11px]";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 320 200" aria-hidden className="block h-auto w-full">
      {children}
    </svg>
  );
}

export function TilesIllustration() {
  const rows = ["..##....", ".####...", ".###.##.", "..#####.", "...##..."];
  return (
    <Frame>
      <TileGrid rows={rows} cell={34} gap={4} x={8} y={6} emptyClassName={EMPTY} />
      {/* One large tile split into its small tiles. */}
      <g transform="translate(160 82)">
        <rect width="34" height="34" rx="5" className="fill-white/[0.06]" />
        {[0, 1, 2, 3].flatMap((r) =>
          [0, 1, 2, 3].map((c) =>
            (r + c) % 3 !== 0 ? (
              <rect key={`${r}${c}`} x={1 + c * 8.25} y={1 + r * 8.25} width="7.25" height="7.25" rx="1.2" fill={MAP_COLORS.smallTile} />
            ) : null,
          ),
        )}
      </g>
      <path
        d="M90 20 C 100 60, 60 80, 80 110 S 160 120, 180 100 S 250 120, 240 170"
        fill="none"
        stroke={MAP_COLORS.track}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Frame>
  );
}

export function SquareIllustration() {
  const rows = [".##.#.##", "#qqqq##.", ".qqqq###", "#qqqq.#.", ".qqqq#.."];
  return (
    <Frame>
      <TileGrid rows={rows} cell={34} gap={4} x={8} y={6} emptyClassName={EMPTY} />
      <rect x="43" y="41" width="154" height="154" rx="7" fill="none" stroke="white" strokeWidth="2" strokeDasharray="5 4" />
      <rect x="208" y="10" width="60" height="26" rx="13" fill={MAP_COLORS.square} />
      <text x="238" y="27.5" textAnchor="middle" className="fill-white text-[12px] font-semibold">
        4 × 4
      </text>
    </Frame>
  );
}

export function CountriesIllustration() {
  const countries = [
    { code: "FR", share: 0.82, label: "3,42 %" },
    { code: "BE", share: 0.36, label: "0,87 %" },
    { code: "CH", share: 0.14, label: "0,12 %" },
    { code: "IT", share: 0.06, label: "0,03 %" },
  ];
  return (
    <Frame>
      {countries.map(({ code, share, label }, index) => {
        const y = 22 + index * 44;
        return (
          <g key={code}>
            <rect x="12" y={y - 14} width="38" height="28" rx="6" className="fill-white/10" />
            <text x="31" y={y + 4.5} textAnchor="middle" className="fill-white text-[12px] font-semibold">
              {code}
            </text>
            <rect x="62" y={y - 5} width="190" height="10" rx="5" className="fill-white/10" />
            <rect x="62" y={y - 5} width={190 * share} height="10" rx="5" fill={MAP_COLORS.tile} />
            <text x="308" y={y + 4} textAnchor="end" className={LABEL}>
              {label}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

export function StationsIllustration() {
  const line = "M10 150 C 70 150, 90 60, 160 70 S 250 150, 310 50";
  return (
    <Frame>
      <path d={line} fill="none" className="stroke-white/15" strokeWidth="6" strokeLinecap="round" />
      {/* Unlocked part of the railway, between the visited stations. */}
      <path d={line} fill="none" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" pathLength="100" strokeDasharray="58 100" />
      {[
        { cx: 40, cy: 146, visited: true },
        { cx: 160, cy: 70, visited: true },
        { cx: 222, cy: 113, visited: true },
        { cx: 296, cy: 64, visited: false },
      ].map(({ cx, cy, visited }) => (
        <circle
          key={cx}
          cx={cx}
          cy={cy}
          r="9"
          strokeWidth="4"
          className={visited ? "fill-white stroke-[#f59e0b]" : "fill-neutral-700 stroke-neutral-500"}
        />
      ))}
      <g transform="translate(92 92) rotate(-52)">
        <rect x="-16" y="-7" width="32" height="14" rx="5" className="fill-white" />
        <rect x="-10" y="-3.5" width="8" height="7" rx="1.5" className="fill-neutral-800" />
        <rect x="2" y="-3.5" width="8" height="7" rx="1.5" className="fill-neutral-800" />
      </g>
    </Frame>
  );
}

function Hexagon({ x, y, size, className, children }: { x: number; y: number; size: number; className: string; children?: React.ReactNode }) {
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${x + size * Math.cos(angle)},${y + size * Math.sin(angle)}`;
  }).join(" ");
  return (
    <g>
      <polygon points={points} className={className} strokeWidth="3" strokeLinejoin="round" />
      {children}
    </g>
  );
}

export function BadgesIllustration() {
  return (
    <Frame>
      <Hexagon x={70} y={110} size={44} className="fill-white/10 stroke-white/20">
        <text x="70" y="116" textAnchor="middle" className="fill-white/70 text-[16px] font-bold">
          50
        </text>
      </Hexagon>
      <Hexagon x={160} y={95} size={62} className="fill-amber-400 stroke-amber-200">
        <path d="M140 108 L154 84 L164 98 L172 88 L184 108 Z" className="fill-amber-900/80" />
        <text x="160" y="128" textAnchor="middle" className="fill-amber-950 text-[12px] font-bold">
          1 000
        </text>
      </Hexagon>
      <Hexagon x={250} y={110} size={44} className="fill-white/5 stroke-white/15">
        <rect x="241" y="106" width="18" height="14" rx="3" className="fill-white/30" />
        <path d="M244 106 v-4 a6 6 0 0 1 12 0 v4" fill="none" className="stroke-white/30" strokeWidth="2.5" />
      </Hexagon>
    </Frame>
  );
}

export function HistoryIllustration() {
  const rows = ["..##.....", ".####.##.", ".######..", "..####.##"];
  return (
    <Frame>
      {/* The tiles visited after the selected date are faded. */}
      <TileGrid rows={rows} cell={28} gap={5} x={12} y={8} emptyClassName={EMPTY} opacity={(c) => (c < 5 ? 1 : 0.2)} />
      <rect x="20" y="166" width="280" height="6" rx="3" className="fill-white/15" />
      <rect x="20" y="166" width="168" height="6" rx="3" fill={MAP_COLORS.tile} />
      <circle cx="188" cy="169" r="10" className="fill-white" />
      <text x="20" y="194" className={LABEL}>
        2019
      </text>
      <text x="300" y="194" textAnchor="end" className={LABEL}>
        2026
      </text>
    </Frame>
  );
}

export function CommunityIllustration() {
  const people = [
    { initials: "AM", color: "#16a34a", following: true },
    { initials: "BL", color: "#db2777", following: false },
    { initials: "CD", color: "#f59e0b", following: false },
  ];
  return (
    <Frame>
      {people.map(({ initials, color, following }, index) => {
        const y = 14 + index * 60;
        return (
          <g key={initials}>
            <rect x="10" y={y} width="300" height="50" rx="12" className="fill-white/[0.06]" />
            <circle cx="38" cy={y + 25} r="16" fill={color} />
            <text x="38" y={y + 29.5} textAnchor="middle" className="fill-white text-[12px] font-semibold">
              {initials}
            </text>
            <rect x="64" y={y + 15} width="96" height="8" rx="4" className="fill-white/50" />
            <rect x="64" y={y + 29} width="60" height="6" rx="3" className="fill-white/20" />
            <rect x="222" y={y + 12} width="76" height="26" rx="13" className={following ? "fill-white/10" : "fill-white"} />
            <rect x="244" y={y + 22.5} width="32" height="5" rx="2.5" className={following ? "fill-white/50" : "fill-neutral-900"} />
          </g>
        );
      })}
    </Frame>
  );
}
