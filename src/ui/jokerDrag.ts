export function insertJoker(
  ids: readonly number[],
  id: number,
  target: number,
): readonly number[] {
  const from = ids.indexOf(id);
  const to = Math.max(0, Math.min(ids.length - 1, target));
  if (from < 0 || from === to) return ids;
  const next = ids.filter((value) => value !== id);
  next.splice(to, 0, id);
  return next;
}
export function closestSlot(x: number, centers: readonly number[]): number {
  return centers.reduce(
    (best, center, index) =>
      Math.abs(center - x) < Math.abs(centers[best] - x) ? index : best,
    0,
  );
}
