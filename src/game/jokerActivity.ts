import { activePenalty } from "./progression";
import { nextRandom } from "./deck";
import type { GameState } from "./types";
export function disabledJoker(state: GameState): number | null {
  return activePenalty(state) === "joker_debuff" ? state.disabledJokerId : null;
}
export function activeJokers(state: GameState) {
  const disabled = disabledJoker(state);
  return state.jokers.filter((joker) => joker.id !== disabled);
}
export function refreshDisabled(state: GameState): GameState {
  if (
    state.phase !== "playing" ||
    activePenalty(state) !== "joker_debuff" ||
    !state.jokers.length
  )
    return { ...state, disabledJokerId: null };
  const roll = nextRandom(state.penaltyRng);
  return {
    ...state,
    penaltyRng: roll.state,
    disabledJokerId:
      state.jokers[Math.floor(roll.value * state.jokers.length)].id,
  };
}
