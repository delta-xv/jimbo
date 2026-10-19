import { formatNumber } from "../../../src/i18n/format";
import { expect, it } from "vitest";
import { scoreHand } from "../../../src/game/score";
import { cardName, formatStep, translate } from "../../../src/i18n/format";
import { en, zh, handNames, jokerTexts } from "../../../src/i18n/messages";
import { HANDS, JOKER_IDS } from "../../../src/game/config";

it("TC-042: every UI, hand and Joker translation has both languages and matching parameters", () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort());
  for (const key of Object.keys(zh) as (keyof typeof zh)[]) {
    expect(en[key].length).toBeGreaterThan(0);
    expect(en[key].match(/\{\w+\}/g)?.sort() ?? []).toEqual(
      zh[key].match(/\{\w+\}/g)?.sort() ?? [],
    );
  }
  for (const locale of ["zh-CN", "en"] as const) {
    expect(Object.keys(handNames[locale]).sort()).toEqual(
      Object.keys(HANDS).sort(),
    );
    expect(Object.keys(jokerTexts[locale]).sort()).toEqual(
      [...JOKER_IDS].sort(),
    );
  }
  expect(translate("en", "selectedCount", { count: 3 })).toBe(
    "3 / 5 cards selected",
  );
});
it("TC-043: old score traces can switch language without rescoring or changing the game result", () => {
  const result = scoreHand(
    [
      { id: 1, rank: "10", suit: "spades" },
      { id: 2, rank: "10", suit: "hearts" },
    ],
    [{ id: 1000, kind: "joker" }],
  );
  const snapshot = structuredClone(result);
  expect(formatStep(result.steps[0], "en")).toEqual({
    source: "Pair",
    detail: "Base hand",
  });
  expect(formatStep(result.steps[1], "en")).toEqual({
    source: "10♠",
    detail: "+10 Chips",
  });
  expect(formatStep(result.steps[3], "en")).toEqual({
    source: "Joker",
    detail: "+4 Mult",
  });
  expect(formatStep(result.steps[3], "zh-CN")).toEqual({
    source: "小丑",
    detail: "+4 倍率",
  });
  expect(result).toEqual(snapshot);
  expect(result.score).toBe(180);
});
it("TC-044: screen reader card names are localized", () => {
  expect(cardName({ rank: "A", suit: "spades" }, "en")).toBe("A of Spades");
  expect(cardName({ rank: "A", suit: "spades" }, "zh-CN")).toBe("黑桃A");
});

it("TC-134: displayed multipliers keep at most two decimals without padding integers", () => {
  expect(formatNumber(13.5, "en")).toBe("13.5");
  expect(formatNumber(20.2567, "en")).toBe("20.26");
  expect(formatNumber(20, "zh-CN")).toBe("20");
});
