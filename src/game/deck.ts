import type { Card } from "./types";
import { RANKS, SUITS } from "./config";

export function createDeck(firstId = 1): Card[] {
  return SUITS.flatMap((suit, suitIndex) =>
    RANKS.map((rank, rankIndex) => ({
      id: firstId + suitIndex * 13 + rankIndex,
      suit,
      rank,
    })),
  );
}

export function sortByRank(cards: readonly Card[]): Card[] {
  return [...cards].sort(
    (a, b) =>
      RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank) ||
      SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit),
  );
}

export function nextRandom(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let value = next;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return { value: ((value ^ (value >>> 14)) >>> 0) / 4294967296, state: next };
}

export function shuffle<T>(
  items: readonly T[],
  state: number,
): { items: T[]; state: number } {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const random = nextRandom(state);
    state = random.state;
    const j = Math.floor(random.value * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return { items: result, state };
}
