import { activeJokers, disabledJoker } from "./jokerActivity";
import { nextRandom } from "./deck";
import { SUITS } from "./config";
import { suitMatches } from "./score";
import type { Card, GameState, Joker } from "./types";
export function preparePlay(state: GameState, cards: readonly Card[]) {
  let effectRng = state.effectRng;
  const jokers = state.jokers.map((joker) => {
    if (joker.id === disabledJoker(state)) return joker;
    if (joker.kind === "green_joker")
      return { ...joker, value: (joker.value ?? 0) + 3 };
    if (joker.kind === "square_joker" && cards.length === 4)
      return { ...joker, value: (joker.value ?? 0) + 12 };
    if (joker.kind === "misprint") {
      const roll = nextRandom(effectRng);
      effectRng = roll.state;
      return { ...joker, value: Math.floor(roll.value * 24) };
    }
    return joker;
  });
  return { jokers, effectRng };
}
export function afterDiscard(
  state: GameState,
  cards: readonly Card[],
): readonly Joker[] {
  const smeared = activeJokers(state).some((j) => j.kind === "smeared_joker");
  return state.jokers.map((joker) =>
    joker.id === disabledJoker(state)
      ? joker
      : joker.kind === "green_joker"
        ? { ...joker, value: Math.max(0, (joker.value ?? 0) - 3) }
        : joker.kind === "castle"
          ? {
              ...joker,
              value:
                (joker.value ?? 0) +
                8 *
                  cards.filter((card) =>
                    suitMatches(
                      card.suit,
                      joker.targetSuit ?? "spades",
                      smeared,
                    ),
                  ).length,
            }
          : joker,
  );
}
export function prepareJokerTargets<T extends Joker>(
  items: readonly T[],
  round: number,
  state: number,
) {
  const prepared = items.map((joker) => {
    if (
      (joker.kind !== "ancient_joker" && joker.kind !== "castle") ||
      (joker.targetRound === round && joker.targetSuit)
    )
      return joker;
    const roll = nextRandom(state);
    state = roll.state;
    return {
      ...joker,
      targetSuit: SUITS[Math.floor(roll.value * SUITS.length)],
      targetRound: round,
    };
  });
  return { items: prepared, state };
}
export function roundJokers(state: GameState, round: number) {
  const prepared = prepareJokerTargets(state.jokers, round, state.effectRng);
  return { jokers: prepared.items, effectRng: prepared.state };
}
