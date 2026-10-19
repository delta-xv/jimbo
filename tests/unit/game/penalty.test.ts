import { expect, it } from "vitest";
import { createGame, gameReducer } from "../../../src/game/reducer";
import {
  scorePlay,
  playProblem,
  handLimit,
  targetScore,
} from "../../../src/game/penalty";
import { createDeck } from "../../../src/game/deck";
import {
  activePenalty,
  roundInfo,
  TOTAL_ROUNDS,
  type PenaltyId,
} from "../../../src/game/progression";
import type { GameState } from "../../../src/game/types";
function penaltyState(penalty: PenaltyId): GameState {
  return {
    ...gameReducer(createGame(42), { type: "start" }),
    round: 3,
    penalties: [penalty, "one_hand_type", "forced_card"],
    forcedCardId: null,
    playedHandTypes: [],
    penaltyRng: 42,
  };
}
function enterPenalty(penalty: PenaltyId) {
  return gameReducer(
    { ...penaltyState(penalty), round: 2, phase: "shop" as const },
    { type: "nextRound" },
  );
}
it("TC-053: exactly three sets of three rounds, with negatives only on each third round", () => {
  expect(TOTAL_ROUNDS).toBe(9);
  expect(Array.from({ length: 9 }, (_, i) => roundInfo(i + 1))).toEqual(
    Array.from({ length: 9 }, (_, i) => ({
      stage: Math.floor(i / 3) + 1,
      roundInStage: (i % 3) + 1,
      isPenalty: i % 3 === 2,
    })),
  );
});
it("TC-054: three random penalties are reproducible and never repeat in a run", () => {
  const one = createGame(1);
  expect(one.penalties).toEqual(createGame(1).penalties);
  expect(
    Array.from({ length: 100 }, (_, i) => createGame(i).penalties).some(
      (penalties) => new Set(penalties).size < 3,
    ),
  ).toBe(false);
  expect(
    new Set(
      Array.from({ length: 12 }, (_, i) => createGame(i).penalties.join(",")),
    ).size,
  ).toBeGreaterThan(1);
  expect(activePenalty(one)).toBeNull();
  expect(activePenalty({ ...one, round: 3 })).toBe(one.penalties[0]);
});
it("TC-055: face debuff preserves poker type and removes rank-chip contributions", () => {
  const cards = createDeck()
    .filter((c) => c.rank === "K")
    .slice(0, 2);
  expect(scorePlay(penaltyState("face_debuff"), cards)).toMatchObject({
    hand: "pair",
    chips: 10,
    mult: 2,
    score: 20,
  });
});
it("TC-056: first played hand type locks the penalty, other types are rejected without spending", () => {
  let state = enterPenalty("one_hand_type");
  state = gameReducer(state, { type: "play", ids: [state.hand[0].id] });
  state = gameReducer(state, { type: "animationDone" });
  expect(state.playedHandTypes).toEqual(["high"]);
  const pair = createDeck()
    .filter((c) => c.rank === "10")
    .slice(0, 2);
  state = { ...state, hand: pair };
  expect(playProblem(state, pair)).toBe("handTypeRequired");
  expect(gameReducer(state, { type: "play", ids: pair.map((c) => c.id) })).toBe(
    state,
  );
});
it("TC-057: a forced card is chosen on entry and required for both play and discard", () => {
  let state = enterPenalty("forced_card");
  const forced = state.forcedCardId!;
  expect(state.hand.some((c) => c.id === forced)).toBe(true);
  const other = state.hand.find((c) => c.id !== forced)!;
  expect(gameReducer(state, { type: "play", ids: [other.id] })).toBe(state);
  expect(gameReducer(state, { type: "discard", ids: [other.id] })).toBe(state);
  state = gameReducer(state, { type: "discard", ids: [forced] });
  expect(state.forcedCardId).not.toBe(forced);
  expect(state.hand.some((c) => c.id === state.forcedCardId)).toBe(true);
});
it("TC-058: negative state and resources reset when the next set begins", () => {
  const state = {
    ...enterPenalty("no_discards"),
    phase: "shop" as const,
    playedHandTypes: ["pair" as const],
    forcedCardId: 1,
  };
  expect(state.discards).toBe(0);
  const next = gameReducer(state, { type: "nextRound" });
  expect(next).toMatchObject({
    round: 4,
    playedHandTypes: [],
    forcedCardId: null,
    discards: 4,
    hands: 4,
  });
  expect(activePenalty(next)).toBeNull();
});
it("TC-059: no-discard penalty has zero discards and cannot discard", () => {
  const state = enterPenalty("no_discards");
  expect(state.discards).toBe(0);
  expect(gameReducer(state, { type: "discard", ids: [state.hand[0].id] })).toBe(
    state,
  );
});
it("TC-060: one-hand penalty gets exactly one play with a halved target", () => {
  const state = enterPenalty("one_hand");
  expect(state.hands).toBe(1);
  expect(targetScore(state)).toBe(state.rules.targets[2] / 2);
  const lost = gameReducer(state, { type: "play", ids: [state.hand[0].id] });
  expect(lost).toMatchObject({ hands: 0, phase: "lost" });
});
it("TC-061: reduced hand limit applies to opening deal and refills", () => {
  let state = enterPenalty("small_hand");
  expect(handLimit(state)).toBe(7);
  expect(state.hand).toHaveLength(7);
  state = gameReducer(state, {
    type: "discard",
    ids: state.hand.slice(0, 2).map((c) => c.id),
  });
  expect(state.hand).toHaveLength(7);
  expect([...state.hand, ...state.deck, ...state.used]).toHaveLength(52);
});
it("TC-062: a hand type can only be used once with the no-repeat effect", () => {
  let state = enterPenalty("no_repeat");
  state = gameReducer(state, { type: "play", ids: [state.hand[0].id] });
  state = gameReducer(state, { type: "animationDone" });
  expect(playProblem(state, [state.hand[0]])).toBe("handAlreadyPlayed");
  expect(gameReducer(state, { type: "play", ids: [state.hand[0].id] })).toBe(
    state,
  );
});
