import { expect, it } from "vitest";
import { gameReducer, createGame } from "../../../src/game/reducer";
import { jokerGrowth } from "../../../src/ui/jokerGrowth";
import type { GameState, Action } from "../../../src/game/types";
const base = (): GameState => ({
  ...gameReducer(createGame(1), { type: "start" }),
  jokers: [
    { id: 1000, kind: "castle", value: 16, targetSuit: "hearts" },
    { id: 1001, kind: "green_joker", value: 3 },
    { id: 1002, kind: "square_joker", value: 12 },
    { id: 1003, kind: "supernova" },
    { id: 1004, kind: "misprint", value: 9 },
    { id: 1005, kind: "blueprint" },
  ],
  nextId: 1006,
});
it("TC-151: one discard can grow Castle and reduce Green Joker without changing game state", () => {
  const state = base();
  const heart = state.hand.find((card) => card.suit === "hearts")!;
  const action: Action = { type: "discard", ids: [heart.id] };
  const next = gameReducer(state, action);
  const snapshot = structuredClone(next);
  expect(jokerGrowth(state, next, action)).toEqual([
    { id: 1000, direction: "gain" },
    { id: 1001, direction: "loss" },
  ]);
  expect(next).toEqual(snapshot);
});
it("TC-152: valid four-card play grows Square, Green and the current Supernova hand only", () => {
  const state = base();
  const action: Action = {
    type: "play",
    ids: state.hand.slice(0, 4).map((c) => c.id),
  };
  const next = gameReducer(state, action);
  expect(jokerGrowth(state, next, action)).toEqual([
    { id: 1001, direction: "gain" },
    { id: 1002, direction: "gain" },
    { id: 1003, direction: "gain" },
  ]);
});
it("TC-153: zero-floor decreases, unmatched suits and rejected actions give no feedback", () => {
  const state = {
    ...base(),
    jokers: [
      { id: 1000, kind: "castle" as const, targetSuit: "hearts" as const },
      { id: 1001, kind: "green_joker" as const, value: 0 },
    ],
  };
  const action: Action = {
    type: "discard",
    ids: [state.hand.find((c) => c.suit !== "hearts")!.id],
  };
  expect(jokerGrowth(state, gameReducer(state, action), action)).toEqual([]);
  expect(jokerGrowth(state, state, { type: "play", ids: [] })).toEqual([]);
});
it("TC-154: disabled cards do not glow and resume, sorting, buying and new rounds do not replay growth", () => {
  const state = {
    ...base(),
    round: 3,
    penalties: ["joker_debuff", "no_discards", "small_hand"] as const,
    disabledJokerId: 1003,
  };
  const play: Action = { type: "play", ids: [state.hand[0].id] };
  const next = gameReducer(state, play);
  expect(jokerGrowth(state, next, play)).toEqual([
    { id: 1001, direction: "gain" },
  ]);
  for (const action of [
    { type: "resume", state: next },
    { type: "reorderJokers", ids: next.jokers.map((j) => j.id) },
    { type: "buy", id: 1000 },
    { type: "nextRound" },
    { type: "animationDone" },
  ] as Action[])
    expect(jokerGrowth(state, next, action)).toEqual([]);
});
it("TC-155: switching Supernova hand types still gives a gain rather than a false loss", () => {
  const state = {
    ...base(),
    runHandCounts: { pair: 30, high: 2 },
    jokers: [{ id: 1003, kind: "supernova" as const }],
  };
  const action: Action = { type: "play", ids: [state.hand[0].id] };
  const next = gameReducer(state, action);
  expect(next.lastScore?.hand).toBe("high");
  expect(jokerGrowth(state, next, action)).toEqual([
    { id: 1003, direction: "gain" },
  ]);
});
