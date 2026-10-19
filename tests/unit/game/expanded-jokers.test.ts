import { expect, it } from "vitest";
import { scoreHand } from "../../../src/game/score";
import { createGame, gameReducer } from "../../../src/game/reducer";
import { scorePlay, handLimit } from "../../../src/game/penalty";
import type { Card, Joker, JokerId, Rank, Suit } from "../../../src/game/types";
const c = (rank: Rank, suit: Suit = "spades", id = 1): Card => ({
  rank,
  suit,
  id,
});
const j = (kind: JokerId, id = 100): Joker => ({ kind, id });
it("TC-082: suit, even and Fibonacci bonuses apply per scoring card", () => {
  expect(scoreHand([c("A")], [j("wrathful_joker")]).score).toBe(80);
  expect(
    scoreHand([c("2")], [j("even_steven"), j("fibonacci", 101)]).score,
  ).toBe(91);
  expect(scoreHand([c("A", "hearts")], [j("lusty_joker")]).mult).toBe(5);
  expect(scoreHand([c("A", "diamonds")], [j("greedy_joker")]).mult).toBe(5);
  expect(scoreHand([c("A", "clubs")], [j("gluttonous_joker")]).mult).toBe(5);
});
it("TC-083: face effects follow physical Joker order and Photograph fires once per play", () => {
  const cards = [c("K")];
  expect(
    scoreHand(cards, [
      j("scary_face"),
      j("smiley_face", 101),
      j("photograph", 102),
    ]),
  ).toMatchObject({ chips: 45, mult: 12 });
  expect(
    scoreHand(cards, [j("photograph"), j("smiley_face", 101)]),
  ).toMatchObject({ mult: 7 });
  const result = scoreHand(cards, [j("photograph"), j("sock_and_buskin", 101)]);
  expect(
    result.steps.filter((s) => s.kind === "joker" && s.joker === "photograph"),
  ).toHaveLength(1);
});
it("TC-084: Pareidolia combines with both retriggers, while debuffed cards do not score", () => {
  const cards = [c("2")];
  const jokers = [j("pareidolia"), j("hack", 101), j("sock_and_buskin", 102)];
  expect(scoreHand(cards, jokers)).toMatchObject({ chips: 11, mult: 1 });
  expect(scoreHand(cards, jokers, { debuffFaces: true })).toMatchObject({
    chips: 5,
    scoringIds: [],
    debuffedIds: [1],
  });
});
it("TC-085: passive rules change hand recognition and Splash includes kickers", () => {
  const cards = [
    c("2"),
    c("4", "spades", 2),
    c("6", "clubs", 3),
    c("8", "clubs", 4),
  ];
  const jokers = [
    j("four_fingers"),
    j("shortcut", 101),
    j("smeared_joker", 102),
  ];
  expect(scoreHand(cards, jokers).hand).toBe("straightFlush");
  const pair = [c("2"), c("2", "hearts", 2), c("A", "clubs", 3)];
  expect(scoreHand(pair, [j("splash")]).chips).toBe(25);
  expect(scoreHand([c("2"), c("3", "hearts", 2)], [j("half_joker")]).mult).toBe(
    21,
  );
  expect(scoreHand(pair, [j("half_joker")]).mult).toBe(2);
});
it("TC-086: permanent growth updates once and run history survives the next stage", () => {
  let state = gameReducer(createGame(1), { type: "start" });
  state = {
    ...state,
    jokers: [j("green_joker"), j("square_joker", 101)],
    hand: [
      c("2"),
      c("3", "hearts", 2),
      c("5", "clubs", 3),
      c("7", "diamonds", 4),
    ],
  };
  const preview = scorePlay(state, state.hand);
  const next = gameReducer(state, { type: "play", ids: [1, 2, 3, 4] });
  expect(next.lastScore).toEqual(preview);
  expect(next.jokers.map((j) => j.value)).toEqual([3, 12]);
  expect(gameReducer(next, { type: "play", ids: [1, 2, 3, 4] })).toBe(next);
  const reset = gameReducer(
    { ...next, locked: false, phase: "shop", round: 3 },
    { type: "nextRound" },
  );
  expect(reset.jokers.map((j) => j.value)).toEqual([3, 12]);
  expect(reset.runHandCounts).toEqual(next.runHandCounts);
});
it("TC-087: Blueprint copies scoring and retriggers without copying another Blueprint", () => {
  const cards = [c("2")];
  expect(scoreHand(cards, [j("blueprint"), j("joker", 101)]).mult).toBe(9);
  expect(
    scoreHand(cards, [j("blueprint"), j("blueprint", 101), j("joker", 102)])
      .mult,
  ).toBe(9);
  expect(scoreHand(cards, [j("blueprint"), j("hack", 101)]).chips).toBe(11);
});
it("TC-088: suit targets, diverse suits and stage scaling have concrete effects", () => {
  expect(
    scoreHand([c("A")], [{ ...j("ancient_joker"), targetSuit: "spades" }]).mult,
  ).toBe(1.5);
  expect(
    scoreHand(
      [c("2", "clubs"), c("3", "hearts", 2)],
      [j("splash"), j("seeing_double", 101)],
    ).mult,
  ).toBe(2);
  const four = [
    c("2"),
    c("3", "hearts", 2),
    c("4", "diamonds", 3),
    c("5", "clubs", 4),
  ];
  expect(scoreHand(four, [j("splash"), j("flower_pot", 101)])).toMatchObject({
    chips: 69,
    mult: 3,
  });
  expect(scoreHand(four, [j("four_fingers"), j("the_order", 101)]).mult).toBe(
    12,
  );
  expect(
    scoreHand([c("A")], [j("supernova")], { runHandCounts: { high: 2 } }).mult,
  ).toBe(10);
});
it("TC-089: Merry Andy changes next-round resources and cannot bypass no-discards", () => {
  let state = {
    ...createGame(1),
    phase: "shop" as const,
    jokers: [j("merry_andy")],
  };
  const next = gameReducer(state, { type: "nextRound" });
  expect(next.discards).toBe(7);
  expect(handLimit(next)).toBe(7);
  expect(next.hand).toHaveLength(7);
  expect(
    gameReducer(
      {
        ...state,
        round: 2,
        penalties: ["no_discards", "small_hand", "face_debuff"],
      },
      { type: "nextRound" },
    ).discards,
  ).toBe(0);
});
it("TC-090: random scoring previews are repeatable and do not consume a random stream", () => {
  const state = {
    ...gameReducer(createGame(42), { type: "start" }),
    jokers: [j("misprint")],
  };
  const before = structuredClone(state);
  const result = scorePlay(state, [state.hand[0]]);
  expect(scorePlay(state, [state.hand[0]])).toEqual(result);
  expect(state).toEqual(before);
  const played = gameReducer(state, { type: "play", ids: [state.hand[0].id] });
  expect(played.lastScore).toEqual(result);
  expect(played.effectRng).not.toBe(state.effectRng);
});

it("TC-091: discard growth counts matching cards once, clamps Green Joker, and survives the round", () => {
  let state = {
    ...gameReducer(createGame(42), { type: "start" }),
    jokers: [
      { ...j("castle"), value: 8, targetSuit: "spades" as const },
      { ...j("green_joker", 101), value: 2 },
      j("smeared_joker", 102),
    ],
  };
  const cards = state.hand
    .filter((card) => ["spades", "clubs"].includes(card.suit))
    .slice(0, 2);
  const discarded = gameReducer(state, {
    type: "discard",
    ids: cards.map((c) => c.id),
  });
  expect(discarded.jokers[0].value).toBe(24);
  expect(discarded.jokers[1].value).toBe(0);
  expect(discarded.effectRng).toBe(state.effectRng);
  const next = gameReducer(
    { ...discarded, phase: "shop" },
    { type: "nextRound" },
  );
  expect(next.jokers[0].value).toBe(24);
  expect(next.effectRng).not.toBe(discarded.effectRng);
  expect(next).toEqual(
    gameReducer({ ...discarded, phase: "shop" }, { type: "nextRound" }),
  );
});
it("TC-092: Supernova retains history between rounds and counts this play once", () => {
  const state = {
    ...createGame(42),
    phase: "shop" as const,
    runHandCounts: { pair: 2 },
    jokers: [j("supernova")],
  };
  const next = gameReducer(state, { type: "nextRound" });
  expect(next.runHandCounts).toEqual({ pair: 2 });
  const pair = [c("2"), c("2", "hearts", 2)];
  const ready = { ...next, hand: pair };
  const result = gameReducer(ready, { type: "play", ids: [1, 2] });
  expect(result.lastScore?.mult).toBe(11);
  expect(result.runHandCounts.pair).toBe(3);
});
it("TC-093: Boss hand-type checks use passive Joker rules", () => {
  const cards = [
    c("2"),
    c("3", "hearts", 2),
    c("4", "diamonds", 3),
    c("5", "clubs", 4),
  ];
  const state = {
    ...gameReducer(createGame(42), { type: "start" }),
    round: 3,
    penalties: ["one_hand_type", "no_discards", "small_hand"] as const,
    playedHandTypes: ["straight"] as const,
    hand: cards,
    jokers: [j("four_fingers")],
  };
  expect(gameReducer(state, { type: "play", ids: [1, 2, 3, 4] }).hands).toBe(
    state.hands - 1,
  );
  const repeat = {
    ...state,
    penalties: ["no_repeat", "no_discards", "small_hand"] as const,
  };
  expect(gameReducer(repeat, { type: "play", ids: [1, 2, 3, 4] })).toBe(repeat);
});
it("TC-094: Blueprint uses the target's growth without growing it twice", () => {
  const cards = [
    c("2"),
    c("3", "hearts", 2),
    c("4", "diamonds", 3),
    c("5", "clubs", 4),
  ];
  const state = {
    ...gameReducer(createGame(42), { type: "start" }),
    hand: cards,
    jokers: [j("blueprint"), j("square_joker", 101)],
  };
  const next = gameReducer(state, { type: "play", ids: [1, 2, 3, 4] });
  expect(next.jokers[1].value).toBe(12);
  expect(next.lastScore?.chips).toBe(34);
});

it("TC-115: Blueprint does not copy passive rules or create a second owned card", () => {
  for (const kind of [
    "four_fingers",
    "shortcut",
    "smeared_joker",
    "pareidolia",
    "merry_andy",
    "splash",
  ] as const) {
    const cards = [
      c("2"),
      c("3", "hearts", 2),
      c("4", "diamonds", 3),
      c("5", "clubs", 4),
    ];
    expect(scoreHand(cards, [j("blueprint"), j(kind, 101)]).score).toBe(
      scoreHand(cards, [j(kind, 101)]).score,
    );
  }
  const before = {
    ...createGame(1),
    phase: "shop" as const,
    money: 20,
    jokers: [j("joker")],
    offers: [{ id: 101, kind: "blueprint" as const, sold: false }],
  };
  const bought = gameReducer(before, { type: "buy", id: 101 });
  const ordered = gameReducer(bought, {
    type: "reorderJokers",
    ids: [101, 100],
  });
  expect(ordered.jokers.map((joker) => joker.kind)).toEqual([
    "blueprint",
    "joker",
  ]);
  expect(scoreHand([c("2")], ordered.jokers).mult).toBe(9);
});

it("TC-126: Supernova counts the full run across stages and ownership changes, and resets on a new run", () => {
  let state = gameReducer(createGame(42), { type: "start" });
  state = gameReducer(
    gameReducer(state, { type: "play", ids: [state.hand[0].id] }),
    { type: "animationDone" },
  );
  state = gameReducer(
    {
      ...state,
      round: 3,
      phase: "shop",
      offers: [{ id: 1000, kind: "supernova", sold: false }],
      money: 20,
    },
    { type: "buy", id: 1000 },
  );
  state = gameReducer(state, { type: "nextRound" });
  expect(state.runHandCounts.high).toBe(1);
  expect(scorePlay(state, [state.hand[0]]).mult).toBe(7);
  state = gameReducer(
    gameReducer(state, { type: "play", ids: [state.hand[0].id] }),
    { type: "animationDone" },
  );
  const reset = gameReducer(state, { type: "restart", seed: 43 });
  expect(reset.runHandCounts).toEqual({});
  const nextStage = gameReducer(
    { ...state, round: 6, phase: "shop" },
    { type: "nextRound" },
  );
  expect(nextStage.runHandCounts.high).toBe(2);
  expect(scorePlay(nextStage, [nextStage.hand[0]]).mult).toBe(10);
});
