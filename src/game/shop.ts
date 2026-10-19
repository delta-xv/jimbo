import { JOKER_IDS, DEFAULT_PACK_WEIGHTS } from "./config";
import { nextRandom } from "./deck";
import type { JokerId, PackId } from "./types";
export function sampleJokers(
  count: number,
  state: number,
  excluded: readonly JokerId[] = [],
): { items: JokerId[]; state: number } {
  const pool = JOKER_IDS.filter((id) => !excluded.includes(id)),
    items: JokerId[] = [];
  while (items.length < count && pool.length) {
    const roll = nextRandom(state);
    state = roll.state;
    const index = Math.floor(roll.value * pool.length);
    items.push(pool.splice(index, 1)[0]);
  }
  return { items, state };
}

export function samplePack(
  state: number,
  weights: Readonly<Record<PackId, number>> = DEFAULT_PACK_WEIGHTS,
): { kind: PackId; state: number } {
  const kinds: PackId[] = ["buffoon", "jumbo", "mega"],
    roll = nextRandom(state);
  let threshold =
    roll.value * kinds.reduce((sum, kind) => sum + weights[kind], 0);
  return {
    kind: kinds.find((kind) => (threshold -= weights[kind]) < 0)!,
    state: roll.state,
  };
}
