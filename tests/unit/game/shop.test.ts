import { JOKERS, PACKS } from "../../../src/game/config";
import type { JokerId } from "../../../src/game/types";
import { parseRun, serializeRun } from "../../../src/save/run";
import { expect, it } from "vitest";
import { createGame, gameReducer } from "../../../src/game/reducer";

const shop = (seed = 42) =>
  gameReducer(
    { ...createGame(seed), phase: "roundWon" as const, money: 30 },
    { type: "enterShop" },
  );

it("TC-072: shop has two visible Jokers and one sealed pack; rerolls preserve the pack", () => {
  const before = shop();
  expect(before.offers).toHaveLength(2);
  expect(before.pack).toMatchObject({ status: "sealed", choices: [] });
  expect(before.rerollCost).toBe(1);
  const after = gameReducer(before, { type: "reroll" });
  expect(after.money).toBe(29);
  expect(after.rerollCost).toBe(2);
  expect(after.offers).toHaveLength(2);
  expect(after.pack).toBe(before.pack);
  expect(after.packRng).toBe(before.packRng);
  expect(after.deckRng).toBe(before.deckRng);
});

it.each([
  ["buffoon", 4, 2, 1],
  ["jumbo", 6, 3, 1],
  ["mega", 8, 4, 2],
] as const)(
  "TC-073: %s charges once and grants only its allowed picks",
  (kind, price, size, picks) => {
    const before = {
      ...shop(),
      pack: { kind, status: "sealed" as const, choices: [], remaining: 0 },
    };
    let state = gameReducer(before, { type: "openPack" });
    expect(state.money).toBe(30 - price);
    expect(state.pack?.choices).toHaveLength(size);
    expect(new Set(state.pack?.choices.map((card) => card.kind)).size).toBe(
      size,
    );
    expect(state.pack?.remaining).toBe(picks);
    expect(gameReducer(state, { type: "openPack" })).toBe(state);
    expect(gameReducer(state, { type: "reroll" })).toBe(state);
    expect(gameReducer(state, { type: "nextRound" })).toBe(state);
    expect(gameReducer(state, { type: "buy", id: state.offers[0].id })).toBe(
      state,
    );
    expect(gameReducer(state, { type: "choosePack", id: -1 })).toBe(state);
    const choices = state.pack!.choices;
    for (const card of choices.slice(0, picks)) {
      state = gameReducer(state, { type: "choosePack", id: card.id });
      expect(gameReducer(state, { type: "choosePack", id: card.id })).toBe(
        state,
      );
    }
    expect(state.pack?.status).toBe("spent");
    expect(state.jokers.map((card) => card.id)).toEqual(
      choices.slice(0, picks).map((card) => card.id),
    );
    expect(state.money).toBe(30 - price);
    expect(
      gameReducer(state, { type: "choosePack", id: choices.at(-1)!.id }),
    ).toBe(state);
    expect(gameReducer(state, { type: "reroll" }).pack).toBe(state.pack);
    expect(gameReducer(state, { type: "nextRound" }).pack).toBeNull();
  },
);

it("TC-074: unaffordable packs stay sealed and selling during selection frees a slot", () => {
  const before = {
    ...shop(),
    pack: {
      kind: "mega" as const,
      status: "sealed" as const,
      choices: [],
      remaining: 0,
    },
  };
  const poor = { ...before, money: 7 };
  expect(gameReducer(poor, { type: "openPack" })).toBe(poor);
  const jokers = Array.from({ length: 6 }, (_, id) => ({
    id,
    kind: "joker" as const,
  }));
  let state = gameReducer(
    { ...before, jokers: jokers.slice(0, 5) },
    { type: "openPack" },
  );
  const [first, second] = state.pack!.choices;
  state = gameReducer(state, { type: "choosePack", id: first.id });
  expect(state.jokers).toHaveLength(6);
  expect(state.pack?.remaining).toBe(1);
  expect(gameReducer(state, { type: "choosePack", id: second.id })).toBe(state);
  state = gameReducer(state, { type: "sell", id: 0 });
  state = gameReducer(state, { type: "choosePack", id: second.id });
  expect(state.jokers).toHaveLength(6);
  expect(state.pack?.status).toBe("spent");
});

it("TC-075: skipping forfeits remaining picks without a refund or disturbing other random streams", () => {
  const before = shop();
  const opened = gameReducer(before, { type: "openPack" });
  expect(opened).toEqual(gameReducer(shop(), { type: "openPack" }));
  expect(opened.deckRng).toBe(before.deckRng);
  expect(opened.shopRng).toBe(before.shopRng);
  expect(opened.penaltyRng).toBe(before.penaltyRng);
  const skipped = gameReducer(opened, { type: "skipPack" });
  expect(skipped.money).toBe(opened.money);
  expect(skipped.jokers).toEqual(before.jokers);
  expect(skipped.pack?.status).toBe("spent");
  expect(gameReducer(skipped, { type: "openPack" })).toBe(skipped);
  expect(gameReducer(skipped, { type: "skipPack" })).toBe(skipped);
});

it("TC-109: paid rerolls exclude both previous offers, including sold slots, across consecutive rerolls", () => {
  for (let seed = 1; seed <= 100; seed++) {
    let state = { ...shop(seed), money: 99 };
    for (const offer of state.offers.slice(0, seed % 3))
      state = gameReducer(state, { type: "buy", id: offer.id });
    for (let count = 0; count < 6; count++) {
      const before = state;
      state = gameReducer(state, { type: "reroll" });
      expect(state).not.toBe(before);
      expect(state.offers).toHaveLength(2);
      expect(new Set(state.offers.map((offer) => offer.kind)).size).toBe(2);
      expect(
        state.offers.every(
          (offer) => !before.offers.some((old) => old.kind === offer.kind),
        ),
      ).toBe(true);
      expect(state.money).toBe(before.money - before.rerollCost);
      expect(state.pack).toBe(before.pack);
    }
  }
});

it("TC-111: shops, rerolls and packs exclude owned Joker kinds", () => {
  for (let seed = 0; seed < 80; seed++) {
    const owned = [
      "joker",
      "blueprint",
      "card_sharp",
      "blue_joker",
      "fibonacci",
    ] as const;
    const before = {
      ...createGame(seed),
      phase: "roundWon" as const,
      money: 99,
      jokers: owned.map((kind, id) => ({ id, kind })),
    };
    const stocked = gameReducer(before, { type: "enterShop" });
    const rerolled = gameReducer(stocked, { type: "reroll" });
    const opened = gameReducer(rerolled, { type: "openPack" });
    for (const offer of [
      ...stocked.offers,
      ...rerolled.offers,
      ...opened.pack!.choices,
    ])
      expect(owned).not.toContain(offer.kind);
  }
});
it("TC-112: duplicate purchases and pack picks are rejected without spending or consuming choices", () => {
  const before = {
    ...shop(),
    jokers: [{ id: 1, kind: "joker" as const }],
    offers: [{ id: 2, kind: "joker" as const, sold: false }],
  };
  expect(gameReducer(before, { type: "buy", id: 2 })).toBe(before);
  const opened = {
    ...before,
    pack: {
      kind: "mega" as const,
      status: "open" as const,
      choices: [{ id: 3, kind: "joker" as const, sold: false }],
      remaining: 2,
    },
  };
  expect(gameReducer(opened, { type: "choosePack", id: 3 })).toBe(opened);
});

it.each(["buffoon", "jumbo", "mega"] as const)(
  "TC-143: a full rack can open %s before selling, without extra charges or excess picks",
  (kind) => {
    let before = gameReducer(
      {
        ...gameReducer(createGame(42), { type: "start" }),
        phase: "roundWon",
        money: 30,
      },
      { type: "enterShop" },
    );
    const kinds = Object.keys(JOKERS).slice(0, 6) as JokerId[];
    before = {
      ...before,
      jokers: kinds.map((kind, i) => ({ kind, id: before.nextId + i })),
      nextId: before.nextId + 6,
      pack: { kind, status: "sealed", choices: [], remaining: 0 },
    };
    let opened = gameReducer(before, { type: "openPack" });
    expect(opened.pack?.status).toBe("open");
    expect(opened.money).toBe(before.money - PACKS[kind].price);
    expect(opened.jokers).toEqual(before.jokers);
    expect(opened.pack!.choices.every((c) => !kinds.includes(c.kind))).toBe(
      true,
    );
    expect(gameReducer(opened, { type: "openPack" })).toBe(opened);
    const choice = opened.pack!.choices[0];
    expect(gameReducer(opened, { type: "choosePack", id: choice.id })).toBe(
      opened,
    );
    const restored = parseRun(serializeRun(opened)).state!;
    expect(restored).toEqual(opened);
    opened = gameReducer(restored, { type: "sell", id: opened.jokers[0].id });
    const money = opened.money;
    const picked = gameReducer(opened, { type: "choosePack", id: choice.id });
    expect(picked.jokers).toHaveLength(6);
    expect(picked.money).toBe(money);
    expect(picked.pack!.remaining).toBe(PACKS[kind].picks - 1);
    const skipped = gameReducer(restored, { type: "skipPack" });
    expect(skipped.money).toBe(restored.money);
    expect(skipped.jokers).toEqual(restored.jokers);
    expect(skipped.pack?.status).toBe("spent");
  },
);
