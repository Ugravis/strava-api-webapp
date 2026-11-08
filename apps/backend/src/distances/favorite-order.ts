/**
 * Order of the favorite badges `favorites` (current order) once `requested` puts
 * some of them first: unknown and repeated identifiers are ignored, and the
 * badges left out follow in their current order.
 */
export function favoriteOrder(
  favorites: string[],
  requested: string[],
): string[] {
  const known = new Set(favorites);
  const first = [...new Set(requested)].filter((id) => known.has(id));
  const placed = new Set(first);
  return [...first, ...favorites.filter((id) => !placed.has(id))];
}
