import { expect, it } from "vitest";
import { createGame, gameReducer } from "../../src/game/reducer";
import type { Action } from "../../src/game/types";
import fixture from "../fixtures/winning-run.json";

it("TC-038: a fixed legal run reaches all nine rounds, eight shops and victory", () => {
  let state = gameReducer(createGame(fixture.seed), { type: "start" });
  const rounds = new Set<number>();
  let shops = 0;
  for (const item of fixture.route) {
    const action = item.action as Action;
    const before = structuredClone(state);
    const next = gameReducer(state, action);
    expect(next).not.toBe(state);
    expect(state).toEqual(before);
    state = gameReducer(next, { type: "animationDone" });
    expect(new Set(state.jokers.map((joker) => joker.kind)).size).toBe(
      state.jokers.length,
    );
    expect([...state.hand, ...state.deck, ...state.used]).toHaveLength(52);
    expect(
      new Set(
        [...state.hand, ...state.deck, ...state.used].map((card) => card.id),
      ).size,
    ).toBe(52);
    rounds.add(state.round);
    if (action.type === "enterShop") shops++;
  }
  expect([...rounds]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(shops).toBe(8);
  expect(state).toMatchObject(fixture.final);
  expect(state.jokers).toHaveLength(fixture.jokerCount);
  expect(state.penalties).toEqual(fixture.penalties);
});

it("TC-039: an unsuccessful run can reset with no prior score, inventory or cards", () => {
  let state = gameReducer(createGame(1), { type: "start" });
  for (let turn = 0; turn < 4; turn++) {
    state = gameReducer(state, { type: "play", ids: [state.hand[0].id] });
    state = gameReducer(state, { type: "animationDone" });
  }
  expect(state.phase).toBe("lost");
  const reset = gameReducer(state, { type: "restart", seed: 2 });
  expect(reset).toEqual(gameReducer(createGame(2), { type: "start" }));
});
