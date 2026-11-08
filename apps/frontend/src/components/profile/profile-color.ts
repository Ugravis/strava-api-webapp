import type { CSSProperties } from "react";

/** Hue of a profile without a color of its own. */
export const DEFAULT_PROFILE_COLOR = "#8b5cf6";

export const PROFILE_COLOR_PRESETS = [
  { key: "violet", value: "#8b5cf6" },
  { key: "blue", value: "#3b82f6" },
  { key: "teal", value: "#14b8a6" },
  { key: "green", value: "#22c55e" },
  { key: "amber", value: "#f59e0b" },
  { key: "orange", value: "#f97316" },
  { key: "rose", value: "#f43f5e" },
  { key: "slate", value: "#64748b" },
] as const;

type Rgb = [number, number, number];

const rgbOf = (hex: string): Rgb => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as Rgb;

const hexOf = (rgb: Rgb) => `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;

/** The color moved toward white (positive share) or black (negative share). */
export function shade(hex: string, share: number): string {
  const target = share > 0 ? 255 : 0;
  return hexOf(rgbOf(hex).map((channel) => channel + (target - channel) * Math.abs(share)) as Rgb);
}

/** Relative luminance, in [0, 1]. */
function luminance(hex: string): number {
  const [r, g, b] = rgbOf(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.039_28 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface ProfileColorStyles {
  banner: CSSProperties;
  /** Background and text of the tiles widget. */
  widget: CSSProperties;
  /** Secondary text on the widget. */
  soft: CSSProperties;
  /** Outline of the card. */
  border: CSSProperties;
  /** Glow of the hue in the top left corner of the body of the card, under the banner, and in its bottom right one. */
  veil: CSSProperties;
}

/** Shades of the hue of a profile, its banner and widget readable whatever the color picked. */
export function profileColorStyles(color: string | null): ProfileColorStyles {
  const base = color ?? DEFAULT_PROFILE_COLOR;
  // Dark text on the widget when the color is light.
  const lightWidget = luminance(base) > 0.45;
  return {
    banner: {
      backgroundImage: `linear-gradient(135deg, ${shade(base, 0.35)}, ${base} 50%, ${shade(base, -0.6)})`,
    },
    widget: {
      backgroundImage: `linear-gradient(135deg, ${base}, ${shade(base, -0.3)})`,
      color: lightWidget ? "#09090b" : "#ffffff",
    },
    soft: { color: lightWidget ? "rgb(9 9 11 / 0.7)" : shade(base, 0.7) },
    border: { borderColor: `${base}99` },
    veil: {
      backgroundImage: `radial-gradient(circle at 0% 0%, ${base}33, transparent 45%), radial-gradient(circle at 100% 100%, ${base}33, transparent 55%)`,
    },
  };
}
