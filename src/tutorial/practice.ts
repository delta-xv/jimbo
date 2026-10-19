import { HANDS } from "../game/config";
import type { Card } from "../game/types";

export interface Practice {
  readonly cards: readonly Card[];
  readonly selected: readonly number[];
  readonly score: number;
  readonly hands: number;
  readonly played: boolean;
}
export function createPractice(): Practice {
  return {
    cards: [
      { id: 1, rank: "9", suit: "hearts" },
      { id: 2, rank: "4", suit: "clubs" },
      { id: 3, rank: "9", suit: "spades" },
      { id: 4, rank: "K", suit: "diamonds" },
    ],
    selected: [],
    score: 0,
    hands: 4,
    played: false,
  };
}
export function hasPracticePair(state: Practice): boolean {
  return (
    state.selected.length === 2 &&
    state.selected.includes(1) &&
    state.selected.includes(3)
  );
}
export function practiceReducer(
  state: Practice,
  action: { type: "toggle"; id: number } | { type: "play" | "reset" },
): Practice {
  if (action.type === "reset") return createPractice();
  if (state.played) return state;
  if (action.type === "toggle") {
    if (!state.cards.some((card) => card.id === action.id)) return state;
    return {
      ...state,
      selected: state.selected.includes(action.id)
        ? state.selected.filter((id) => id !== action.id)
        : [...state.selected, action.id],
    };
  }
  if (!hasPracticePair(state)) return state;
  return {
    ...state,
    score: (HANDS.pair.chips + 18) * HANDS.pair.mult,
    hands: state.hands - 1,
    played: true,
    selected: [],
    cards: state.cards.map((card) =>
      card.id === 1
        ? { id: 5, rank: "A", suit: "hearts" }
        : card.id === 3
          ? { id: 6, rank: "6", suit: "spades" }
          : card,
    ),
  };
}
export const TUTORIAL_SEEN_KEY = "jimbo:tutorial-seen:v1";
export function hasSeenTutorial(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_SEEN_KEY) === "yes";
  } catch {
    return false;
  }
}
export function markTutorialSeen(): void {
  try {
    window.localStorage.setItem(TUTORIAL_SEEN_KEY, "yes");
  } catch {}
}
