import { activeJokers, disabledJoker } from "./jokerActivity";
import type { Card, GameState } from "./types";
import { activePenalty } from "./progression";
import { preparePlay } from "./jokerState";
import { scoreHand, evaluateHand } from "./score";
import { nextRandom } from "./deck";
import { CONFIG } from "./config";
export function scorePlay(state: GameState, cards: readonly Card[]) {
  return scoreHand(cards, preparePlay(state, cards).jokers, {
    disabledJokerId: disabledJoker(state),
    debuffedCardIds:
      activePenalty(state) === "played_cards_debuff"
        ? cards
            .filter((card) =>
              state.stagePlayedCards.includes(`${card.suit}:${card.rank}`),
            )
            .map((card) => card.id)
        : [],
    runHandCounts: state.runHandCounts,
    debuffFaces: activePenalty(state) === "face_debuff",
    remainingDiscards: state.discards,
    remainingDeckCount: state.deck.length,
    playedHandTypes: state.playedHandTypes,
  });
}
export type PlayProblem =
  "forcedCardRequired" | "handTypeRequired" | "handAlreadyPlayed";
export function playProblem(
  state: GameState,
  cards: readonly Card[],
): PlayProblem | null {
  if (!cards.length) return null;
  const penalty = activePenalty(state);
  if (
    penalty === "forced_card" &&
    state.forcedCardId !== null &&
    !cards.some((card) => card.id === state.forcedCardId)
  )
    return "forcedCardRequired";
  const type = evaluateHand(cards, activeJokers(state)).hand;
  if (
    penalty === "one_hand_type" &&
    state.playedHandTypes.length > 0 &&
    state.playedHandTypes[0] !== type
  )
    return "handTypeRequired";
  if (penalty === "no_repeat" && state.playedHandTypes.includes(type))
    return "handAlreadyPlayed";
  return null;
}
export function handLimit(state: GameState): number {
  return Math.max(
    1,
    CONFIG.handSize -
      (activePenalty(state) === "small_hand" ? 1 : 0) -
      state.jokers.filter((j) => j.kind === "merry_andy").length,
  );
}
export function targetScore(state: GameState): number {
  const penalty = activePenalty(state);
  const factor =
    penalty === "large_target"
      ? 1.5
      : penalty === "one_hand"
        ? 0.5
        : penalty === "one_hand_type"
          ? 0.75
          : 1;
  return Math.ceil(state.rules.targets[state.round - 1] * factor);
}
export function refreshForced(state: GameState): GameState {
  if (
    state.phase !== "playing" ||
    activePenalty(state) !== "forced_card" ||
    state.hand.length === 0
  )
    return { ...state, forcedCardId: null };
  const roll = nextRandom(state.penaltyRng);
  return {
    ...state,
    forcedCardId: state.hand[Math.floor(roll.value * state.hand.length)].id,
    penaltyRng: roll.state,
  };
}
