import { validRules } from "../../../src/game/rules";
import { expect, it } from "vitest";
import { scoreHand } from "../../../src/game/score";
import { createGame, gameReducer } from "../../../src/game/reducer";
import { scorePlay, targetScore } from "../../../src/game/penalty";
import type { Card } from "../../../src/game/types";
const straight: Card[] = [
  { id: 1, rank: "2", suit: "spades" },
  { id: 2, rank: "3", suit: "spades" },
  { id: 3, rank: "4", suit: "spades" },
  { id: 4, rank: "5", suit: "spades" },
  { id: 5, rank: "K", suit: "hearts" },
];
it("TC-095: Four Fingers excludes unrelated kickers from a straight flush unless Splash is held", () => {
  const result = scoreHand(straight, [{ id: 100, kind: "four_fingers" }]);
  expect(result).toMatchObject({
    hand: "straightFlush",
    scoringIds: [1, 2, 3, 4],
    score: 912,
  });
  expect(
    scoreHand(straight, [
      { id: 100, kind: "four_fingers" },
      { id: 101, kind: "splash" },
    ]).score,
  ).toBe(992);
  const mixed = [
    ...straight.slice(0, 3),
    { ...straight[3], suit: "hearts" as const },
    { ...straight[4], suit: "spades" as const },
  ];
  expect(
    scoreHand(mixed, [{ id: 100, kind: "four_fingers" }]).scoringIds,
  ).toEqual([1, 2, 3, 4, 5]);
});
it.each([
  [0, 0],
  [4, 0],
  [5, 1],
  [24, 4],
  [25, 5],
  [100, 5],
])(
  "TC-096: interest on $%s is $%s, uses pre-reward cash and pays once",
  (money, interest) => {
    const before = {
      ...gameReducer(createGame(42), { type: "start" }),
      score: 299,
      money,
    };
    const after = gameReducer(before, {
      type: "play",
      ids: [before.hand[0].id],
    });
    expect(after.reward?.interest).toBe(interest);
    expect(after.money).toBe(money + after.reward!.base + 3 + interest);
    const unlocked = gameReducer(after, { type: "animationDone" });
    expect(gameReducer(unlocked, { type: "animationDone" }).money).toBe(
      after.money,
    );
    expect(gameReducer(unlocked, { type: "enterShop" }).money).toBe(
      after.money,
    );
  },
);
it("TC-097: a one-hand penalty halves the target score", () => {
  const game = {
    ...createGame(42),
    round: 9,
    penalties: ["no_discards", "face_debuff", "one_hand"] as const,
  };
  expect(targetScore(game)).toBe(game.rules.targets[8] / 2);
});

it("TC-098: disabled Jokers neither score nor supply passive rules and Blueprint cannot skip their position", () => {
  const cards = [{ id: 1, rank: "K", suit: "spades" } as Card];
  const jokers = [
    { id: 10, kind: "blueprint" as const },
    { id: 11, kind: "smiley_face" as const },
    { id: 12, kind: "joker" as const },
  ];
  expect(scoreHand(cards, jokers, { disabledJokerId: 11 }).mult).toBe(5);
  expect(
    scoreHand(straight.slice(0, 4), [{ id: 10, kind: "four_fingers" }], {
      disabledJokerId: 10,
    }).hand,
  ).toBe("high");
  expect(
    scoreHand(
      cards,
      [
        { id: 10, kind: "abstract_joker" },
        { id: 11, kind: "joker" },
      ],
      { disabledJokerId: 11 },
    ).mult,
  ).toBe(7);
});
it("TC-099: random disabling is seeded, survives previews/discards/reordering, and expires outside the penalty round", () => {
  const setup = {
    ...createGame(42),
    round: 2,
    phase: "shop" as const,
    penalties: ["joker_debuff", "face_debuff", "one_hand"] as const,
    jokers: [
      { id: 10, kind: "joker" as const },
      { id: 11, kind: "green_joker" as const },
    ],
  };
  const state = gameReducer(setup, { type: "nextRound" });
  expect([10, 11]).toContain(state.disabledJokerId);
  expect(state).toEqual(gameReducer(setup, { type: "nextRound" }));
  const discard = gameReducer(state, {
    type: "discard",
    ids: [state.hand[0].id],
  });
  expect(discard.disabledJokerId).toBe(state.disabledJokerId);
  const reorder = gameReducer(discard, {
    type: "reorderJokers",
    ids: [11, 10],
  });
  expect(reorder.disabledJokerId).toBe(state.disabledJokerId);
  const next = gameReducer(
    { ...reorder, phase: "shop" },
    { type: "nextRound" },
  );
  expect(next.disabledJokerId).toBeNull();
});
it("TC-100: a larger-target penalty scales only its third round and preserves custom base targets", () => {
  const state = {
    ...createGame(42),
    round: 9,
    penalties: ["no_discards", "face_debuff", "large_target"] as const,
  };
  expect(targetScore(state)).toBe(30000);
  expect(targetScore({ ...state, round: 8 })).toBe(state.rules.targets[7]);
});
it("TC-101: a disabled Pareidolia cannot enable face bonuses or face retriggers", () => {
  const result = scoreHand(
    [{ id: 1, rank: "2", suit: "spades" }],
    [
      { id: 10, kind: "pareidolia" },
      { id: 11, kind: "sock_and_buskin" },
      { id: 12, kind: "smiley_face" },
    ],
    { disabledJokerId: 10 },
  );
  expect(result).toMatchObject({ chips: 7, mult: 1, score: 7 });
});
it("TC-102: disabled growth stays frozen and reselecting never consumes deck or shop randomness", () => {
  const base = {
    ...gameReducer(createGame(42), { type: "start" }),
    round: 3,
    penalties: ["joker_debuff", "face_debuff", "one_hand"] as const,
    disabledJokerId: 10,
    jokers: [
      { id: 10, kind: "green_joker" as const, value: 12 },
      { id: 11, kind: "joker" as const },
    ],
  };
  const played = gameReducer(base, { type: "play", ids: [base.hand[0].id] });
  expect(played.jokers[0].value).toBe(12);
  expect(
    played.lastScore!.steps.some(
      (step) => step.kind === "joker" && step.instanceId === 10,
    ),
  ).toBe(false);
  const after = gameReducer(played, { type: "animationDone" });
  expect(after.deckRng).toBe(base.deckRng);
  expect(after.shopRng).toBe(base.shopRng);
  expect(after.packRng).toBe(base.packRng);
  expect([10, 11]).toContain(after.disabledJokerId);
  expect(gameReducer(after, { type: "animationDone" })).toBe(after);
});
it("TC-103: default payouts distinguish normal and penalty rounds", () => {
  const initial = gameReducer(createGame(42), { type: "start" });
  const rewards = [1, 2, 3].map(
    (round) =>
      gameReducer(
        { ...initial, round, score: 50000, money: 0 },
        { type: "play", ids: [initial.hand[0].id] },
      ).reward?.base,
  );
  expect(rewards).toEqual([3, 3, 5]);
});
it("TC-105: previously played cards are debuffed by identity across deals, while discards do not enter history", () => {
  let state = gameReducer(createGame(42), { type: "start" });
  const playedCard = state.hand[0];
  state = gameReducer(
    gameReducer(state, { type: "play", ids: [playedCard.id] }),
    { type: "animationDone" },
  );
  expect(state.stagePlayedCards).toContain(
    `${playedCard.suit}:${playedCard.rank}`,
  );
  const discarded = state.hand[0];
  state = gameReducer(state, { type: "discard", ids: [discarded.id] });
  expect(state.stagePlayedCards).not.toContain(
    `${discarded.suit}:${discarded.rank}`,
  );
  const third = {
    ...state,
    round: 3,
    penalties: ["played_cards_debuff", "no_discards", "large_target"] as const,
  };
  const sameCard = { ...playedCard, id: playedCard.id + 104 };
  expect(scorePlay(third, [sameCard])).toMatchObject({
    chips: 5,
    score: 5,
    debuffedIds: [sameCard.id],
  });
  const next = gameReducer({ ...third, phase: "shop" }, { type: "nextRound" });
  expect(next.stagePlayedCards).toEqual([]);
});
it("TC-106: the published mixed-suit straight example scores 34782 with the five listed Jokers", () => {
  const cards: Card[] = [
    { id: 1, rank: "10", suit: "spades" },
    { id: 2, rank: "J", suit: "hearts" },
    { id: 3, rank: "Q", suit: "diamonds" },
    { id: 4, rank: "K", suit: "clubs" },
    { id: 5, rank: "A", suit: "spades" },
  ];
  const result = scoreHand(
    cards,
    [
      { id: 10, kind: "scary_face" },
      { id: 11, kind: "smiley_face" },
      { id: 12, kind: "banner" },
      { id: 13, kind: "abstract_joker" },
      { id: 14, kind: "flower_pot" },
    ],
    { remainingDiscards: 4 },
  );
  expect(result).toMatchObject({ chips: 341, mult: 102, score: 34782 });
});
it("TC-107: custom pack weights are validated and cannot change during a run", () => {
  const rules = {
    ...createGame(1).rules,
    packWeights: { buffoon: 3, jumbo: 2, mega: 1 },
  };
  const game = createGame(1, rules);
  expect(game.rules.packWeights).toEqual(rules.packWeights);
  expect(game.rules.packWeights).not.toBe(rules.packWeights);
  expect(
    validRules({ ...rules, packWeights: { buffoon: 0, jumbo: 1, mega: 1 } }),
  ).toBe(false);
  const playing = gameReducer(game, { type: "start" });
  expect(
    gameReducer(playing, {
      type: "configure",
      rules: { ...rules, packWeights: { buffoon: 1, jumbo: 1, mega: 1 } },
    }),
  ).toBe(playing);
});

it("TC-117: rematch footage targets resolve to 3000 for one hand type and 2000 for one play in stage two", () => {
  const state = { ...createGame(1), round: 6 };
  expect(
    targetScore({
      ...state,
      penalties: ["face_debuff", "one_hand_type", "forced_card"],
    }),
  ).toBe(3000);
  expect(
    targetScore({
      ...state,
      penalties: ["face_debuff", "one_hand", "forced_card"],
    }),
  ).toBe(2000);
});

it("TC-130: Four Fingers combines different four-card straight and flush subsets, unless disabled", () => {
  const cards: Card[] = [
    { id: 1, rank: "2", suit: "spades" },
    { id: 2, rank: "3", suit: "spades" },
    { id: 3, rank: "4", suit: "diamonds" },
    { id: 4, rank: "5", suit: "spades" },
    { id: 5, rank: "10", suit: "spades" },
  ];
  const jokers = [{ id: 1000, kind: "four_fingers" as const }];
  expect(scoreHand(cards, jokers)).toMatchObject({
    hand: "straightFlush",
    score: 992,
  });
  expect(scoreHand(cards, jokers, { disabledJokerId: 1000 }).hand).toBe("high");
});
