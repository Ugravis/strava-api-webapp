/**
 * Categorical hues of the charts, in their fixed order (the palette of the
 * dashboard), each with its own step on dark surfaces.
 */
export interface SeriesColor {
  fill: string;
  stroke: string;
  /** Text color, for the gradients drawn with `currentColor`. */
  text: string;
  swatch: string;
}

export const SERIES_COLORS = {
  blue: {
    fill: "fill-[#2a78d6] dark:fill-[#3987e5]",
    stroke: "stroke-[#2a78d6] dark:stroke-[#3987e5]",
    text: "text-[#2a78d6] dark:text-[#3987e5]",
    swatch: "bg-[#2a78d6] dark:bg-[#3987e5]",
  },
  orange: {
    fill: "fill-[#eb6834] dark:fill-[#d95926]",
    stroke: "stroke-[#eb6834] dark:stroke-[#d95926]",
    text: "text-[#eb6834] dark:text-[#d95926]",
    swatch: "bg-[#eb6834] dark:bg-[#d95926]",
  },
  aqua: {
    fill: "fill-[#1baf7a] dark:fill-[#199e70]",
    stroke: "stroke-[#1baf7a] dark:stroke-[#199e70]",
    text: "text-[#1baf7a] dark:text-[#199e70]",
    swatch: "bg-[#1baf7a] dark:bg-[#199e70]",
  },
  yellow: {
    fill: "fill-[#eda100] dark:fill-[#c98500]",
    stroke: "stroke-[#eda100] dark:stroke-[#c98500]",
    text: "text-[#eda100] dark:text-[#c98500]",
    swatch: "bg-[#eda100] dark:bg-[#c98500]",
  },
  /** What is gathered or done, kept in the background. */
  muted: {
    fill: "fill-muted-foreground/45",
    stroke: "stroke-muted-foreground/45",
    text: "text-muted-foreground/45",
    swatch: "bg-muted-foreground/45",
  },
} as const satisfies Record<string, SeriesColor>;

export type SeriesColorName = keyof typeof SERIES_COLORS;
