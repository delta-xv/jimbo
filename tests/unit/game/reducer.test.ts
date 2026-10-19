import { describe, expect, it } from "vitest";
import { CONFIG, JOKER_IDS } from "../../../src/game/config";
import { createDeck } from "../../../src/game/deck";
import { createGame, gameReducer } from "../../../src/game/reducer";
import type { Action, GameState } from "../../../src/game/types";

const start = (seed = 42) => gameReducer(createGame(seed), { type: "start" });
const unlock = (state: GameState) =>
  gameReducer(state, { type: "animationDone" });
function pairState(score = 250): GameState {
  const all = createDeck();
  const hand = all.filter((card) => card.rank === "10").slice(0, 2);
  return {
    ...start(),
    score,
    hands: 1,
    hand,
    deck: all.filter((card) => !hand.includes(card)),
  };
}
function shop(): GameState {
  const state = pairState();
  return gameReducer(
    unlock(
      gameReducer(state, {
        type: "play",
        ids: state.hand.map((card) => card.id),
      }),
    ),
    { type: "enterShop" },
  );
}
function assertDeck(state: GameState): void {
  const all = [...state.hand, ...state.deck, ...state.used];
  expect(all).toHaveLength(52);
  expect(new Set(all.map((card) => card.id)).size).toBe(52);
}

describe("game transitions", () => {
  it("TC-015: final hand reaching target wins before checking exhaustion", () => {
    const before = pairState();
    const state = gameReducer(before, {
      type: "play",
      ids: before.hand.map((card) => card.id),
    });
    expect(state).toMatchObject({
      score: 310,
      hands: 0,
      phase: "roundWon",
      money: 9,
      locked: true,
      reward: { total: 4 },
    });
    assertDeck(state);
    expect(gameReducer(state, { type: "enterShop" })).toBe(state);
    const next = gameReducer(unlock(state), { type: "enterShop" });
    expect(next.phase).toBe("shop");
    expect(gameReducer(next, { type: "enterShop" })).toBe(next);
  });
  it("TC-016: exhausted hands below target lose without reward", () => {
    const before = pairState(200);
    expect(
      gameReducer(before, {
        type: "play",
        ids: before.hand.map((card) => card.id),
      }),
    ).toMatchObject({ phase: "lost", score: 260, money: 5, reward: null });
  });
  it("TC-017: remaining hands pay once and scoring Jokers do not award money", () => {
    const before = {
      ...pairState(),
      hands: 3,
      jokers: [{ id: 90, kind: "blue_joker" as const }],
    };
    const after = gameReducer(before, {
      type: "play",
      ids: before.hand.map((card) => card.id),
    });
    expect(after.reward).toEqual({ base: 3, hands: 2, interest: 1, total: 6 });
    expect(after.money).toBe(11);
    expect(unlock(unlock(after)).money).toBe(11);
  });
  it("TC-018: buy and sell affect the wallet and cannot repeat", () => {
    const before = {
      ...shop(),
      money: 5,
      offers: [{ id: 91, kind: "banner" as const, sold: false }],
    };
    const bought = gameReducer(before, { type: "buy", id: 91 });
    expect(bought.money).toBe(0);
    expect(bought.jokers).toEqual([{ id: 91, kind: "banner" }]);
    expect(bought.offers[0].sold).toBe(true);
    expect(gameReducer(bought, { type: "buy", id: 91 })).toBe(bought);
    const sold = gameReducer(bought, { type: "sell", id: 91 });
    expect(sold).toMatchObject({ money: 2, jokers: [] });
    expect(gameReducer(sold, { type: "sell", id: 91 })).toBe(sold);
  });
  it("TC-019: reroll cost rises and an unaffordable roll is an exact no-op", () => {
    const before = { ...shop(), money: 2 };
    const after = gameReducer(before, { type: "reroll" });
    expect(after).toMatchObject({ money: 1, rerollCost: 2 });
    expect(after.shopRng).not.toBe(before.shopRng);
    expect(new Set(after.offers.map((offer) => offer.kind)).size).toBe(2);
    expect(after.offers.every((offer) => JOKER_IDS.includes(offer.kind))).toBe(
      true,
    );
    expect(gameReducer(after, { type: "reroll" })).toBe(after);
  });
  it("TC-020: a short deck only refills available cards", () => {
    const all = createDeck();
    const before = {
      ...start(),
      hand: all.slice(0, 3),
      deck: all.slice(3, 4),
      used: all.slice(4),
    };
    const after = gameReducer(before, {
      type: "discard",
      ids: before.hand.slice(0, 2).map((card) => card.id),
    });
    expect(after.hand).toHaveLength(2);
    expect(after.deck).toHaveLength(0);
    expect(after.discards).toBe(3);
    expect(after.hands).toBe(4);
    assertDeck(after);
  });
  it("TC-021: six slots block purchases until one is sold", () => {
    const before = {
      ...shop(),
      money: 100,
      jokers: Array.from({ length: 6 }, (_, id) => ({
        id: id + 1000,
        kind: "banner" as const,
      })),
    };
    const offer = before.offers[0];
    expect(gameReducer(before, { type: "buy", id: offer.id })).toBe(before);
    const sold = gameReducer(before, { type: "sell", id: 1000 });
    expect(
      gameReducer(sold, { type: "buy", id: offer.id }).jokers,
    ).toHaveLength(6);
  });
  it("TC-029: start and restart initialize the complete run", () => {
    const initial = createGame(42);
    expect(initial.phase).toBe("ready");
    const state = gameReducer(initial, { type: "start" });
    expect(state).toMatchObject({
      phase: "playing",
      round: 1,
      hands: 4,
      discards: 4,
      money: 5,
      score: 0,
    });
    expect(state.hand).toHaveLength(8);
    expect(state.deck).toHaveLength(44);
    assertDeck(state);
    expect(start(42)).toEqual(state);
    expect(start(43).hand).not.toEqual(state.hand);
    expect(
      gameReducer({ ...state, money: 99 }, { type: "restart", seed: 42 }),
    ).toEqual(state);
  });
  it("TC-030: invalid selections and wrong phases leave every field untouched", () => {
    const state = start();
    const actions: Action[] = [
      { type: "play", ids: [] },
      { type: "play", ids: [999] },
      { type: "discard", ids: [] },
      { type: "play", ids: [state.hand[0].id, state.hand[0].id] },
      { type: "play", ids: state.hand.slice(0, 6).map((card) => card.id) },
      { type: "nextRound" },
      { type: "enterShop" },
      { type: "buy", id: 0 },
      { type: "sell", id: 0 },
      { type: "reroll" },
    ];
    for (const action of actions)
      expect(gameReducer(state, action)).toBe(state);
    const noDiscards = { ...state, discards: 0 };
    expect(
      gameReducer(noDiscards, { type: "discard", ids: [state.hand[0].id] }),
    ).toBe(noDiscards);
    expect(gameReducer(createGame(1), { type: "play", ids: [1] }).phase).toBe(
      "ready",
    );
  });
  it("TC-031: play refills cards and a second click during settlement does nothing", () => {
    const before = start();
    const action: Action = { type: "play", ids: [before.hand[0].id] };
    const after = gameReducer(before, action);
    expect(after.hand).toHaveLength(8);
    expect(after.used).toHaveLength(1);
    expect(after.hands).toBe(3);
    expect(gameReducer(after, action)).toBe(after);
    assertDeck(after);
  });
  it("TC-032: each new round resets cards and resources but preserves money and Jokers", () => {
    const before = {
      ...shop(),
      jokers: [{ id: 200, kind: "joker" as const }],
      rerollCost: 7,
    };
    const after = gameReducer(before, { type: "nextRound" });
    expect(after).toMatchObject({
      phase: "playing",
      round: 2,
      hands: 4,
      discards: 4,
      score: 0,
      money: before.money,
      jokers: before.jokers,
      rerollCost: 1,
    });
    expect(after.used).toHaveLength(0);
    expect(after.lastScore).toBeNull();
    assertDeck(after);
  });
  it("TC-033: ninth round wins and cannot open a tenth round or shop", () => {
    const before = {
      ...pairState(19950),
      round: 9,
      penalties: ["face_debuff", "one_hand_type", "no_discards"] as const,
    };
    const after = unlock(
      gameReducer(before, {
        type: "play",
        ids: before.hand.map((card) => card.id),
      }),
    );
    expect(after.phase).toBe("won");
    expect(gameReducer(after, { type: "enterShop" })).toBe(after);
    expect(gameReducer(after, { type: "nextRound" })).toBe(after);
  });
  it("TC-034: hand and Joker permutations preserve contents, RNG and score", () => {
    const state = {
      ...start(),
      jokers: [
        { id: 90, kind: "joker" as const },
        { id: 91, kind: "card_sharp" as const },
      ],
    };
    const ids = state.hand.map((card) => card.id).reverse();
    const reordered = gameReducer(state, { type: "reorderHand", ids });
    expect(reordered.hand.map((card) => card.id)).toEqual(ids);
    expect(reordered.deckRng).toBe(state.deckRng);
    expect(gameReducer(state, { type: "reorderHand", ids: [ids[0]] })).toBe(
      state,
    );
    expect(
      gameReducer(state, { type: "reorderJokers", ids: [91, 90] }).jokers.map(
        (j) => j.id,
      ),
    ).toEqual([91, 90]);
    expect(gameReducer(state, { type: "reorderJokers", ids: [90, 90] })).toBe(
      state,
    );
  });
  it("TC-035: empty hand and draw pile ends the run after discard", () => {
    const all = createDeck();
    const before = {
      ...start(),
      hand: all.slice(0, 1),
      deck: [],
      used: all.slice(1),
    };
    const after = gameReducer(before, { type: "discard", ids: [all[0].id] });
    expect(after.phase).toBe("lost");
    assertDeck(after);
  });
  it("TC-036: shop rerolls do not change next-round card order", () => {
    const before = { ...shop(), money: 100 };
    const rerolled = gameReducer(before, { type: "reroll" });
    const a = gameReducer(before, { type: "nextRound" });
    const b = gameReducer(rerolled, { type: "nextRound" });
    expect(a.hand.map(({ rank, suit }) => [rank, suit])).toEqual(
      b.hand.map(({ rank, suit }) => [rank, suit]),
    );
    expect(a.deckRng).toBe(b.deckRng);
  });
  it("TC-037: rules configure exactly nine rounds and six slots", () => {
    expect(CONFIG.targets).toEqual([
      300, 450, 600, 2000, 3000, 4000, 10000, 15000, 20000,
    ]);
    expect(CONFIG.slots).toBe(6);
  });
});
