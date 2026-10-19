import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { I18nProvider } from "../../src/i18n/I18n";
import { Shop } from "../../src/ui/Shop";
import { TableCenter } from "../../src/ui/TableCenter";
import { createGame, gameReducer } from "../../src/game/reducer";
import { JOKER_IDS } from "../../src/game/config";
import type { GameState } from "../../src/game/types";

it("TC-045: English shop includes translated catalog, prices and buttons with no Chinese text", () => {
  const state: GameState = {
    ...createGame(1),
    phase: "shop",
    money: 100,
    offers: JOKER_IDS.map((kind, id) => ({ kind, id, sold: false })),
  };
  const html = renderToStaticMarkup(
    createElement(I18nProvider, {
      initialLocale: "en",
      children: createElement(Shop, { state, dispatch: () => {} }),
    }),
  );
  expect(html).toContain("Blue Joker");
  expect(html).toContain("Buy Card Sharp");
  expect(html).toContain("Reroll $");
  expect(html).not.toMatch(/\p{Script=Han}/u);
});
it.each(["ready", "roundWon", "won", "lost"] as const)(
  "TC-046: English %s screen has no untranslated Chinese text",
  (phase) => {
    const state: GameState = {
      ...gameReducer(createGame(1), { type: "start" }),
      phase,
    };
    const html = renderToStaticMarkup(
      createElement(I18nProvider, {
        initialLocale: "en",
        children: createElement(TableCenter, {
          state,
          preview: null,
          step: null,
          dispatch: () => {},
        }),
      }),
    );
    expect(html).not.toMatch(/\p{Script=Han}/u);
    expect(html).not.toMatch(/\{\w+\}/);
  },
);

it.each(["zh-CN", "en"] as const)(
  "TC-076: %s pack UI hides candidates until purchase and shows free picks afterward",
  (locale) => {
    const shop = gameReducer(
      { ...createGame(1), phase: "roundWon", money: 30 },
      { type: "enterShop" },
    );
    const render = (state: GameState) =>
      renderToStaticMarkup(
        createElement(I18nProvider, {
          initialLocale: locale,
          children: createElement(Shop, { state, dispatch() {} }),
        }),
      );
    const sealed = render(shop);
    expect((sealed.match(/data-offer-id=/g) ?? []).length).toBe(2);
    const opened = gameReducer(shop, { type: "openPack" });
    const html = render(opened);
    expect((html.match(/data-offer-id=/g) ?? []).length).toBe(
      opened.pack!.choices.length,
    );
    expect(html).toContain(locale === "en" ? "left to choose" : "还可选择");
    expect(html).not.toContain(locale === "en" ? "Next round" : "下一回合");
    expect(html).not.toContain('class="price pixel"');
    expect(html).not.toMatch(/\{\w+\}/);
    if (locale === "en") expect(html + sealed).not.toMatch(/\p{Script=Han}/u);
  },
);
