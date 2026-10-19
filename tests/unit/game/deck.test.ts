import { expect, it } from "vitest";
import { createDeck, shuffle } from "../../../src/game/deck";

it("TC-027: standard deck has 52 distinct cards and stable identifiers", () => {
  const deck = createDeck(100);
  expect(deck).toHaveLength(52);
  expect(new Set(deck.map((card) => `${card.rank}-${card.suit}`)).size).toBe(
    52,
  );
  expect(new Set(deck.map((card) => card.id)).size).toBe(52);
  expect(deck[0].id).toBe(100);
  expect(deck.at(-1)?.id).toBe(151);
});
it("TC-028: shuffle is deterministic, preserves input and supports continuation", () => {
  const deck = createDeck();
  const original = structuredClone(deck);
  const result = shuffle(deck, 123);
  expect(result).toEqual(shuffle(deck, 123));
  expect(result.items).not.toEqual(deck);
  expect(result.items.map((card) => card.id).sort((a, b) => a - b)).toEqual(
    deck.map((card) => card.id),
  );
  expect(deck).toEqual(original);
  expect(shuffle(deck, result.state)).not.toEqual(result);
});
