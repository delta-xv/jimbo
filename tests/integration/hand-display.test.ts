import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { I18nProvider } from "../../src/i18n/I18n";
import { Sidebar } from "../../src/ui/Sidebar";
import { TableCenter } from "../../src/ui/TableCenter";
import { createGame, gameReducer } from "../../src/game/reducer";
import { createDeck, shuffle } from "../../src/game/deck";
import { rankValue, scoreHand } from "../../src/game/score";
import type { Card } from "../../src/game/types";

function expectDescending(cards: readonly Card[]) {
  const ranks = cards.map((card) => rankValue(card.rank));
  expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
}

it("TC-070: dealing and replenishing sort ranks without changing the draw pile", () => {
  const initial = createGame(42);
  const shuffled = shuffle(createDeck(), initial.deckRng);
  let state = gameReducer(initial, { type: "start" });
  expectDescending(state.hand);
  expect(state.deck).toEqual(shuffled.items.slice(8));
  expect(state.deckRng).toBe(shuffled.state);
  state = gameReducer(state, {
    type: "reorderHand",
    ids: state.hand.map((card) => card.id).reverse(),
  });
  const deck = state.deck;
  state = gameReducer(state, {
    type: "discard",
    ids: state.hand.slice(0, 2).map((card) => card.id),
  });
  expectDescending(state.hand);
  expect(state.deck).toEqual(deck.slice(2));
  const beforePlay = state.deck;
  state = gameReducer(state, { type: "play", ids: [state.hand[0].id] });
  expectDescending(state.hand);
  expect(state.deck).toEqual(beforePlay.slice(1));
  expect(
    new Set(
      [...state.hand, ...state.deck, ...state.used].map((card) => card.id),
    ).size,
  ).toBe(52);
});

it.each(["zh-CN", "en"] as const)(
  "TC-071: %s selection hides historical hands and highlights the current hand",
  (locale) => {
    const lastScore = scoreHand(
      createDeck()
        .filter((card) => card.rank === "K")
        .slice(0, 3),
    );
    const state = {
      ...gameReducer(createGame(42), { type: "start" }),
      lastScore,
    };
    const render = (child: ReturnType<typeof createElement>) =>
      renderToStaticMarkup(
        createElement(I18nProvider, { initialLocale: locale, children: child }),
      );
    const sidebar = render(
      createElement(Sidebar, {
        state,
        preview: null,
        step: null,
        onRules() {},
        onRestart() {},
        onTrace() {},
      }),
    );
    const empty = render(
      createElement(TableCenter, {
        state,
        preview: null,
        step: null,
        dispatch() {},
      }),
    );
    expect(sidebar + empty).not.toMatch(
      /上次|上一手|Last|Previous|Three of a Kind|三条/,
    );
    const preview = scoreHand(
      createDeck()
        .filter((card) => card.rank === "A")
        .slice(0, 2),
    );
    const selected = render(
      createElement(TableCenter, { state, preview, step: null, dispatch() {} }),
    );
    expect(selected).toContain(
      `class="current-hand-type">${locale === "en" ? "Pair" : "对子"}</h2>`,
    );
  },
);

it("TC-113: selected hands show only their base chips and multiplier, without a total prediction", () => {
  const state = gameReducer(createGame(42), { type: "start" });
  const preview = scoreHand(
    createDeck()
      .filter((card) => card.rank === "A")
      .slice(0, 2),
    [{ id: 1000, kind: "misprint", value: 23 }],
  );
  const html = renderToStaticMarkup(
    createElement(I18nProvider, {
      initialLocale: "en",
      children: createElement(TableCenter, {
        state,
        preview,
        step: null,
        dispatch() {},
      }),
    }),
  );
  expect(html).toContain('class="blue pixel">10</span>');
  expect(html).toContain('class="coral pixel">2</span>');
  expect(html).not.toContain("expected-score");
  expect(html).not.toContain(String(preview.score));
});
