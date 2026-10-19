import { expect, it } from "vitest";
import { DEFAULT_RULES, validRules } from "../../../src/game/rules";
it("TC-047: editable game rules accept defaults and constrained custom values", () => {
  expect(validRules(DEFAULT_RULES)).toBe(true);
  expect(
    validRules({
      hands: 6,
      discards: 0,
      money: 20,
      targets: [100, 200, 500, 600, 700, 800, 900, 1000, 1100],
    }),
  ).toBe(true);
});
it("TC-048: rules reject invalid, fractional, unordered and unbounded values", () => {
  for (const value of [
    null,
    {},
    { ...DEFAULT_RULES, hands: 0 },
    { ...DEFAULT_RULES, hands: 2.5 },
    { ...DEFAULT_RULES, discards: -1 },
    { ...DEFAULT_RULES, money: 100 },
    { ...DEFAULT_RULES, targets: [300, 200, 500] },
    { ...DEFAULT_RULES, targets: [50, 100] },
    { ...DEFAULT_RULES, targets: [50, 100, Infinity] },
  ])
    expect(validRules(value)).toBe(false);
});

it("TC-116: rematch middle-stage base targets are 2000, 3000 and 4000", () => {
  expect(DEFAULT_RULES.targets).toEqual([
    300, 450, 600, 2000, 3000, 4000, 10000, 15000, 20000,
  ]);
});
