/**
 * New positions of the items listed in `order`, which take the positions
 * they held between them: the items left out keep theirs, so a group can be
 * reordered within a wider list. Unknown ids are ignored.
 */
export function reorderedPositions(
  positions: ReadonlyMap<string, number>,
  order: readonly string[],
): [id: string, position: number][] {
  const ids = order.filter((id) => positions.has(id));
  const slots = ids.map((id) => positions.get(id)!).sort((a, b) => a - b);
  return ids.map((id, index) => [id, slots[index]]);
}
