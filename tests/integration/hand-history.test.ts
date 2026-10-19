import { expect, it } from "vitest";
import { createGame, gameReducer } from "../../src/game/reducer";
import { parseRun, serializeRun } from "../../src/save/run";
import type { Action, GameState, HandId } from "../../src/game/types";
import fixture from "../fixtures/winning-run.json";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "../../src/i18n/I18n";
import { HandInfo } from "../../src/ui/HandInfo";

it("TC-157: accepted plays count their final hand once per round and run, including across shops and restore", () => {
  let state = gameReducer(createGame(fixture.seed), { type: "start" });
  const run: Partial<Record<HandId, number>> = {};
  let round: Partial<Record<HandId, number>> = {};
  for (const { action } of fixture.route) {
    const before = state;
    state = gameReducer(state, action as Action);
    if (action.type === "nextRound") round = {};
    if (action.type === "play" && state !== before) {
      const hand = state.lastScore!.hand;
      run[hand] = (run[hand] ?? 0) + 1;
      round[hand] = (round[hand] ?? 0) + 1;
    }
    expect(state.runHandCounts).toEqual(run);
    expect(state.roundHandCounts).toEqual(round);
    const saved = serializeRun(state);
    state = saved ? parseRun(saved).state! : gameReducer(state, { type: "animationDone" });
    expect(state.roundHandCounts).toEqual(round);
  }
  expect(gameReducer(state, { type: "restart", seed: 3 }).roundHandCounts).toEqual({});
});

it.each(["zh-CN", "en"] as const)("TC-160: %s history distinguishes zero counts from unavailable legacy round history", (locale) => {
  const state = {
    ...gameReducer(createGame(1), { type: "start" }),
    runHandCounts: { pair: 5 },
    roundHandCounts: { pair: 2 },
  };
  const render = (value: GameState) => renderToStaticMarkup(createElement(I18nProvider, {
    initialLocale: locale,
    children: createElement(HandInfo, { state: value, onClose() {} }),
  }));
  const html = render(state);
  expect(html.match(/data-hand-type=/g)).toHaveLength(9);
  expect(html).toContain('data-count="run">5</dd>');
  expect(html).toContain('data-count="round">2</dd>');
  expect(html.match(/data-count="round">0<\/dd>/g)).toHaveLength(8);
  expect(render({ ...state, roundHandCounts: undefined }).match(/data-count="round">—<\/dd>/g)).toHaveLength(9);
});

it("TC-158: discards, rejected and locked plays never increase hand counts", () => {
  let state = gameReducer(createGame(1), { type: "start" });
  for (const action of [
    { type: "play", ids: [] },
    { type: "play", ids: [999] },
    { type: "discard", ids: [state.hand[0].id] },
  ] as Action[]) state = gameReducer(state, action);
  expect(state.roundHandCounts).toEqual({});
  state = gameReducer(state, { type: "play", ids: [state.hand[0].id] });
  expect(state.roundHandCounts).toEqual({ high: 1 });
  expect(gameReducer(state, { type: "play", ids: [state.hand[0].id] })).toBe(state);
});

it("TC-159: legacy saves retain run totals without inventing round counts; new rounds record normally", () => {
  const state: GameState = {
    ...gameReducer(createGame(1), { type: "start" }),
    round: 2,
    roundHandCounts: undefined,
    runHandCounts: { high: 5 },
    playedHandTypes: ["high"],
  };
  const restored = parseRun(serializeRun(state)).state!;
  expect(restored.roundHandCounts).toBeUndefined();
  const played = gameReducer(restored, { type: "play", ids: [restored.hand[0].id] });
  expect(played.runHandCounts.high).toBe(6);
  expect(played.roundHandCounts).toBeUndefined();
  const next = gameReducer({ ...restored, phase: "shop" }, { type: "nextRound" });
  expect(next.roundHandCounts).toEqual({});
  for (const invalid of [null, [], { high: -1 }, { pair: 1.5 }, { invalid: 1 }]) {
    const save = JSON.parse(serializeRun(state)!);
    save.state.roundHandCounts = invalid;
    expect(parseRun(JSON.stringify(save)).status).toBe("invalid");
  }
});
