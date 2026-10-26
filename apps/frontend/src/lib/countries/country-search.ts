/** Lower case, without accents nor punctuation: "Côte d'Ivoire" is found by "cote divoire". */
export function searchKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Score of a name for a query, as `cmdk` expects it: 1 for a name starting
 * with the query, 0.75 for one of its words starting with it ("Saint-Marin"
 * found by "marin"), 0.5 for one containing it, 0 otherwise.
 */
export function matchScore(name: string, query: string): number {
  const wanted = searchKey(query);
  if (!wanted) return 1;
  const whole = searchKey(name);
  if (whole.startsWith(wanted)) return 1;
  const words = name.split(/[\s\-'’]+/).map(searchKey);
  if (words.some((word) => word.startsWith(wanted))) return 0.75;
  return whole.includes(wanted) ? 0.5 : 0;
}
