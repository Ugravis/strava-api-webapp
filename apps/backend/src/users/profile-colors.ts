/** Hues suggested for a profile, the same as the picker of the frontend. */
export const PROFILE_COLOR_PRESETS = [
  '#8b5cf6',
  '#3b82f6',
  '#14b8a6',
  '#22c55e',
  '#f59e0b',
  '#f97316',
  '#f43f5e',
  '#64748b',
] as const;

/** One of the suggested hues, so that new profiles do not all look alike. */
export const randomProfileColor = (): string =>
  PROFILE_COLOR_PRESETS[
    Math.floor(Math.random() * PROFILE_COLOR_PRESETS.length)
  ];
