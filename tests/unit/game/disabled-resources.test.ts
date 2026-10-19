import { expect, it } from "vitest";
import { createGame, gameReducer } from "../../../src/game/reducer";
import { handLimit, scorePlay } from "../../../src/game/penalty";
import { nextRandom } from "../../../src/game/deck";
import { parseRun, serializeRun } from "../../../src/save/run";
import type { GameState } from "../../../src/game/types";

function start(): GameState {
  return gameReducer({
    ...createGame(42),
    phase: "shop",
    round: 2,
    penalties: ["joker_debuff", "no_discards", "small_hand"],
    jokers: [{ id: 1000, kind: "merry_andy" }],
    nextId: 1001,
  }, { type: "nextRound" });
}

it("TC-161: disabled Merry Andy retains opening discard allowance and hand size", () => {
  const state = start();
  expect(state.disabledJokerId).toBe(1000);
  expect(state.discards).toBe(7);
  expect(handLimit(state)).toBe(7);
  expect(state.hand).toHaveLength(7);
});

it("TC-162: disable changes, refills and repeated restore never regrant Andy's resources", () => {
  let state = gameReducer(start(), { type: "discard", ids: [start().hand[0].id] });
  expect(state.discards).toBe(6);
  state = { ...state, jokers: [...state.jokers, { id: 1001, kind: "joker" }], nextId: 1002 };
  for (const id of [1001, 1000, 1001]) {
    let seed = 0;
    while (Math.floor(nextRandom(seed).value * 2) !== id - 1000) seed++;
    state = { ...state, penaltyRng: seed };
    state = gameReducer(state, { type: "play", ids: [state.hand[0].id] });
    const restored = parseRun(serializeRun(state)).state!;
    expect(restored).toEqual(gameReducer(state, { type: "animationDone" }));
    expect(restored.disabledJokerId).toBe(id);
    expect(restored.discards).toBe(6);
    expect(handLimit(restored)).toBe(7);
    expect(restored.hand).toHaveLength(7);
    expect(parseRun(serializeRun(restored)).state).toEqual(restored);
    state = restored;
  }
});

it("TC-163: no-discard and reduced-hand penalties still apply over Andy's fixed attributes", () => {
  const base = start();
  const noDiscards = gameReducer({ ...base, phase: "shop", round: 5 }, { type: "nextRound" });
  expect(noDiscards.discards).toBe(0);
  expect(gameReducer(noDiscards, { type: "discard", ids: [noDiscards.hand[0].id] })).toBe(noDiscards);
  const small = gameReducer({ ...base, phase: "shop", round: 8 }, { type: "nextRound" });
  expect(small.discards).toBe(7);
  expect(small.hand).toHaveLength(6);
});

it("TC-164: in-round reordering moves the disabled card without changing resources, history or randomness", () => {
  const base = start();
  const state: GameState = {
    ...base,
    jokers: [
      { id: 1000, kind: "merry_andy" },
      { id: 1001, kind: "blueprint" },
      { id: 1002, kind: "joker" },
    ],
    nextId: 1003,
  };
  const blockedCopy = gameReducer(state, { type: "reorderJokers", ids: [1001, 1000, 1002] });
  expect(blockedCopy).toEqual({ ...state, jokers: [state.jokers[1], state.jokers[0], state.jokers[2]] });
  expect(scorePlay(blockedCopy, [state.hand[0]]).mult).toBe(5);
  const activeCopy = gameReducer(blockedCopy, { type: "reorderJokers", ids: [1000, 1001, 1002] });
  expect(scorePlay(activeCopy, [state.hand[0]]).mult).toBe(9);
  expect(parseRun(serializeRun(blockedCopy)).state).toEqual(blockedCopy);
  const played = gameReducer(activeCopy, { type: "play", ids: [state.hand[0].id] });
  expect(gameReducer(played, { type: "reorderJokers", ids: [1001, 1000, 1002] })).toBe(played);
  const settled = gameReducer(played, { type: "animationDone" });
  const moved = gameReducer(settled, { type: "reorderJokers", ids: [1001, 1000, 1002] });
  expect(moved.lastScore).toBe(settled.lastScore);
  expect(moved.score).toBe(settled.score);
});
