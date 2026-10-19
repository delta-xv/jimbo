import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { I18nProvider } from "../../src/i18n/I18n";
import { DeckInfo } from "../../src/ui/DeckInfo";
import { createGame, gameReducer } from "../../src/game/reducer";
import type { GameState } from "../../src/game/types";
const render = (state: GameState, locale: "en" | "zh-CN" = "en") =>
  renderToStaticMarkup(
    createElement(I18nProvider, {
      initialLocale: locale,
      children: createElement(DeckInfo, { state, onClose() {} }),
    }),
  );
it.each(["en", "zh-CN"] as const)(
  "TC-114: %s deck info accounts for all 52 cards without revealing draw order",
  (locale) => {
    let state = gameReducer(createGame(42), { type: "start" });
    state = gameReducer(state, {
      type: "discard",
      ids: state.hand.slice(0, 3).map((c) => c.id),
    });
    state = gameReducer(
      gameReducer(state, { type: "play", ids: [state.hand[0].id] }),
      { type: "animationDone" },
    );
    const html = render(state, locale);
    expect((html.match(/data-deck-status="draw"/g) ?? []).length).toBe(40);
    expect((html.match(/data-deck-status="held"/g) ?? []).length).toBe(8);
    expect((html.match(/data-deck-status="used"/g) ?? []).length).toBe(4);
    expect(render({ ...state, deck: [...state.deck].reverse() }, locale)).toBe(
      html,
    );
    if (locale === "en") expect(html).not.toMatch(/\p{Script=Han}/u);
  },
);
