import { expect, it } from "vitest";
import { JOKERS, JOKER_IDS } from "../../../src/game/config";
import { sampleJokers } from "../../../src/game/shop";
it("TC-080: all 33 Dave Jokers have rarity, pricing and distinct artwork", () => {
  expect(Object.keys(JOKERS)).toHaveLength(33);
  expect(JOKERS.blueprint.rarity).toBe("rare");
  expect(JOKERS.card_sharp.rarity).toBe("uncommon");
  expect(JOKERS.four_fingers.rarity).toBe("common");
  expect(new Set(Object.values(JOKERS).map((j) => j.art)).size).toBe(33);
  expect(
    Object.values(JOKERS).every(
      (j) => j.price > 0 && j.sell === Math.floor(j.price / 2),
    ),
  ).toBe(true);
});
it("TC-081: all 33 Jokers have equal draw chances and batches are deterministic and distinct", () => {
  expect(sampleJokers(4, 42)).toEqual(sampleJokers(4, 42));
  expect(new Set(sampleJokers(4, 42).items).size).toBe(4);
  let seed = 42;
  const counts = new Map(JOKER_IDS.map((id) => [id, 0]));
  for (let i = 0; i < 33000; i++) {
    const result = sampleJokers(1, seed);
    seed = result.state;
    counts.set(result.items[0], counts.get(result.items[0])! + 1);
  }
  for (const count of counts.values()) {
    expect(count).toBeGreaterThan(850);
    expect(count).toBeLessThan(1150);
  }
});

it("TC-108: sampling respects exclusions and returns every remaining Joker at most once", () => {
  const excluded = JOKER_IDS.slice(0, 2);
  const result = sampleJokers(40, 42, excluded);
  expect(result.items).toHaveLength(31);
  expect(new Set(result.items)).toEqual(new Set(JOKER_IDS.slice(2)));
  expect(sampleJokers(40, 42, [...excluded].reverse())).toEqual(result);
  expect(sampleJokers(4, 42, JOKER_IDS)).toEqual({ items: [], state: 42 });
});
