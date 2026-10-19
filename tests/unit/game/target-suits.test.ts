import { expect, it } from "vitest";
import { createGame, gameReducer } from "../../../src/game/reducer";
import { parseRun, serializeRun } from "../../../src/save/run";
import type { GameState } from "../../../src/game/types";
function won(seed = 1): GameState {
  return {
    ...gameReducer(createGame(seed), { type: "start" }),
    phase: "roundWon",
    money: 99,
    jokers: [
      { id: 1000, kind: "ancient_joker", targetSuit: "spades" },
      { id: 1001, kind: "castle", targetSuit: "hearts", value: 16 },
    ],
    nextId: 1002,
  };
}
it("TC-132: shop determines next-round suits once, and rerolls, restore and next round preserve them", () => {
  const before = won();
  const shop = gameReducer(before, { type: "enterShop" });
  expect(shop.effectRng).not.toBe(before.effectRng);
  const rerolled = gameReducer(shop, { type: "reroll" });
  expect(rerolled.jokers).toEqual(shop.jokers);
  expect(rerolled.effectRng).toBe(shop.effectRng);
  const restored = parseRun(serializeRun(rerolled)).state!;
  expect(restored.jokers).toEqual(shop.jokers);
  const next = gameReducer(restored, { type: "nextRound" });
  expect(next.jokers).toEqual(shop.jokers);
  expect(next.effectRng).toBe(shop.effectRng);
});
it("TC-133: suit-dependent offers and pack candidates expose their future suit and retain it after purchase", () => {
  let foundOffer = false,
    foundPack = false;
  for (let seed = 1; seed <= 80; seed++) {
    const shop = gameReducer(
      { ...won(seed), jokers: [] },
      { type: "enterShop" },
    );
    for (const offer of shop.offers.filter((o) =>
      ["ancient_joker", "castle"].includes(o.kind),
    )) {
      foundOffer = true;
      expect(offer.targetSuit).toBeDefined();
      const bought = gameReducer(shop, { type: "buy", id: offer.id });
      expect(bought.jokers[0].targetSuit).toBe(offer.targetSuit);
      expect(
        gameReducer(bought, { type: "nextRound" }).jokers[0].targetSuit,
      ).toBe(offer.targetSuit);
    }
    const opened = gameReducer(shop, { type: "openPack" });
    for (const choice of opened.pack!.choices.filter((o) =>
      ["ancient_joker", "castle"].includes(o.kind),
    )) {
      foundPack = true;
      expect(choice.targetSuit).toBeDefined();
      const picked = gameReducer(opened, { type: "choosePack", id: choice.id });
      const done = gameReducer(picked, { type: "skipPack" });
      expect(
        gameReducer(done, { type: "nextRound" }).jokers[0].targetSuit,
      ).toBe(choice.targetSuit);
    }
  }
  expect(foundOffer && foundPack).toBe(true);
});
