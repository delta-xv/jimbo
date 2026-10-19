import { expect, it } from "vitest";
import {
  enteringPenalty,
  PENALTY_PRESENTATION,
} from "../../../src/ui/penaltyPresentation";
import { createGame, gameReducer } from "../../../src/game/reducer";
import { PENALTY_IDS } from "../../../src/game/progression";
it("TC-128: entering or restoring a penalty round announces it once without changing the run", () => {
  const before = { ...createGame(1), round: 2, phase: "shop" as const };
  const next = gameReducer(before, { type: "nextRound" });
  const snapshot = structuredClone(next);
  expect(enteringPenalty(before, next)).toEqual({
    round: 3,
    penalty: next.penalties[0],
  });
  expect(enteringPenalty(createGame(1), next)).toEqual({
    round: 3,
    penalty: next.penalties[0],
  });
  expect(enteringPenalty(next, { ...next, score: 100 })).toBeNull();
  expect(enteringPenalty(next, { ...next, phase: "roundWon" })).toBeNull();
  expect(
    enteringPenalty(
      createGame(1),
      gameReducer(createGame(1), { type: "start" }),
    ),
  ).toBeNull();
  expect(next).toEqual(snapshot);
});
it("TC-129: all penalties have a name, explanation and artwork symbol", () => {
  expect(Object.keys(PENALTY_PRESENTATION).sort()).toEqual(
    [...PENALTY_IDS].sort(),
  );
  for (const entry of Object.values(PENALTY_PRESENTATION)) {
    expect(entry.name).toBeTruthy();
    expect(entry.description).toBeTruthy();
    expect(entry.symbol).toBeTruthy();
  }
});
