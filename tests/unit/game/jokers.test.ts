import { expect, it } from "vitest";
import { scoreHand } from "../../../src/game/score";
import { scorePlay } from "../../../src/game/penalty";
import { createGame, gameReducer } from "../../../src/game/reducer";
import { JOKERS } from "../../../src/game/config";
import type { Card, Joker } from "../../../src/game/types";
const pair: Card[] = [
  { id: 1, rank: "10", suit: "spades" },
  { id: 2, rank: "10", suit: "hearts" },
];
const card = (kind: Joker["kind"], id = 1000): Joker => ({ kind, id });
it("TC-064: Banner uses remaining discards and stops contributing with zero discards", () => {
  const state = {
    ...gameReducer(createGame(1), { type: "start" }),
    hand: pair,
    jokers: [card("banner")],
    discards: 4,
  };
  expect(scorePlay(state, pair)).toMatchObject({
    chips: 150,
    mult: 2,
    score: 300,
  });
  expect(scorePlay({ ...state, discards: 2 }, pair).score).toBe(180);
  expect(scorePlay({ ...state, discards: 0 }, pair).score).toBe(60);
});
it("TC-065: Blue Joker counts only the remaining draw pile before refill", () => {
  const state = {
    ...gameReducer(createGame(1), { type: "start" }),
    jokers: [card("blue_joker")],
  };
  expect(state.deck).toHaveLength(44);
  expect(scorePlay(state, pair)).toMatchObject({ chips: 118, score: 236 });
  expect(scorePlay({ ...state, deck: [] }, pair).score).toBe(60);
});
it("TC-066: Abstract Joker counts itself and every owned Joker, without requiring a pair", () => {
  const high = pair.slice(0, 1);
  expect(scoreHand(high, [card("abstract_joker")]).score).toBe(60);
  expect(
    scoreHand(high, [card("abstract_joker"), card("abstract_joker", 1001)])
      .score,
  ).toBe(195);
});
it("TC-067: Card Sharp only triggers on a hand type already played in the current round", () => {
  const state = {
    ...gameReducer(createGame(1), { type: "start" }),
    jokers: [card("card_sharp")],
  };
  expect(scorePlay(state, pair).score).toBe(60);
  expect(scorePlay({ ...state, playedHandTypes: ["pair"] }, pair).score).toBe(
    180,
  );
  expect(scorePlay({ ...state, playedHandTypes: ["high"] }, pair).score).toBe(
    60,
  );
  const reset = gameReducer(
    { ...state, phase: "shop", playedHandTypes: ["pair"] },
    { type: "nextRound" },
  );
  expect(scorePlay(reset, pair).score).toBe(60);
});
it("TC-068: Card Sharp respects left-to-right multiplier order", () => {
  const state = {
    ...gameReducer(createGame(1), { type: "start" }),
    playedHandTypes: ["pair" as const],
    jokers: [card("joker"), card("card_sharp", 1001)],
  };
  expect(scorePlay(state, pair).score).toBe(540);
  expect(
    scorePlay({ ...state, jokers: [...state.jokers].reverse() }, pair).score,
  ).toBe(300);
});
it("TC-069: the original five Joker prices remain consistent in the expanded catalog", () => {
  expect(Object.keys(JOKERS)).toEqual(
    expect.arrayContaining([
      "banner",
      "joker",
      "abstract_joker",
      "card_sharp",
      "blue_joker",
    ]),
  );
  expect(
    Object.fromEntries(Object.entries(JOKERS).map(([k, v]) => [k, v.price])),
  ).toMatchObject({
    banner: 5,
    joker: 2,
    abstract_joker: 4,
    card_sharp: 6,
    blue_joker: 5,
  });
});
