const AVATAR_COLORS = [
  "bg-rose-600",
  "bg-orange-600",
  "bg-amber-600",
  "bg-lime-700",
  "bg-emerald-600",
  "bg-teal-600",
  "bg-sky-600",
  "bg-indigo-600",
  "bg-violet-600",
  "bg-fuchsia-600",
] as const;

/** Up to two initials: first and last word, or the first two letters of a single word. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "?";
  }
  const letters =
    words.length > 1
      ? [Array.from(words[0])[0], Array.from(words[words.length - 1])[0]]
      : Array.from(words[0]).slice(0, 2);
  return letters.join("").toUpperCase();
}

/** Stable color for a given seed, so a user always gets the same one. */
export function avatarColorOf(seed: string): string {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
