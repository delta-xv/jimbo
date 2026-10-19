import { expect, it, vi } from "vitest";
import {
  parseRun,
  serializeRun,
  saveRun,
  loadRun,
} from "../../../src/save/run";
import { createGame, gameReducer } from "../../../src/game/reducer";
import type { Action } from "../../../src/game/types";
import fixture from "../../fixtures/winning-run.json";
it("TC-119: every saved action restores the exact settled run without repeated rewards or random draws", () => {
  let state = gameReducer(createGame(fixture.seed), { type: "start" });
  for (const { action } of fixture.route) {
    state = gameReducer(state, action as Action);
    const expected = gameReducer(state, { type: "animationDone" });
    const saved = serializeRun(state);
    if (expected.phase === "won" || expected.phase === "lost")
      expect(saved).toBeNull();
    else {
      const restored = parseRun(saved);
      expect(restored.status).toBe("ok");
      expect(restored.state).toEqual(expected);
      expect(parseRun(serializeRun(restored.state!)).state).toEqual(expected);
    }
    state = expected;
  }
});
it("TC-120: open packs preserve already chosen cards, price and remaining picks", () => {
  const base = {
    ...gameReducer(createGame(1), { type: "start" }),
    phase: "roundWon" as const,
    money: 30,
  };
  const shop = gameReducer(base, { type: "enterShop" });
  const opened = gameReducer(
    {
      ...shop,
      pack: {
        kind: "mega" as const,
        status: "sealed" as const,
        choices: [],
        remaining: 0,
      },
    },
    { type: "openPack" },
  );
  const picked = gameReducer(opened, {
    type: "choosePack",
    id: opened.pack!.choices[0].id,
  });
  const restored = parseRun(serializeRun(picked)).state!;
  expect(restored).toEqual(picked);
  expect(gameReducer(restored, { type: "openPack" })).toBe(restored);
  expect(
    gameReducer(restored, {
      type: "choosePack",
      id: opened.pack!.choices[0].id,
    }),
  ).toBe(restored);
});
it("TC-121: absent, malformed, incompatible and corrupt saves cannot start a broken game", () => {
  expect(parseRun(null).status).toBe("empty");
  const state = gameReducer(createGame(1), { type: "start" });
  const good = JSON.parse(serializeRun(state)!);
  expect(parseRun(JSON.stringify({ ...good, version: 99 })).status).toBe(
    "unsupported",
  );
  for (const data of [
    "{",
    "null",
    "{}",
    JSON.stringify({ ...good, state: {} }),
    JSON.stringify({
      ...good,
      state: { ...state, deck: [...state.deck, state.hand[0]] },
    }),
    JSON.stringify({ ...good, state: { ...state, money: -1 } }),
    JSON.stringify({
      ...good,
      state: {
        ...state,
        penalties: ["no_discards", "no_discards", "one_hand"],
      },
    }),
    JSON.stringify({
      ...good,
      state: { ...state, hand: state.hand.map((c) => ({ ...c, rank: "Z" })) },
    }),
  ])
    expect(parseRun(data).status).toBe("invalid");
});

it("TC-123: interrupted random-penalty scoring settles exactly once on restore", () => {
  let state = gameReducer(createGame(61), { type: "start" });
  state = gameReducer(
    {
      ...state,
      round: 2,
      phase: "shop",
      jokers: [
        { id: 1000, kind: "misprint" },
        { id: 1001, kind: "blue_joker" },
      ],
    },
    { type: "nextRound" },
  );
  state = gameReducer(state, { type: "play", ids: [state.hand[0].id] });
  expect(state.locked).toBe(true);
  const settled = gameReducer(state, { type: "animationDone" });
  const restored = parseRun(serializeRun(state)).state!;
  expect(restored).toEqual(settled);
  expect(gameReducer(restored, { type: "animationDone" })).toBe(restored);
});
it("TC-124: continuing retains saved rules even after menu settings change", () => {
  const saved = gameReducer(createGame(1), { type: "start" });
  const menu = gameReducer(createGame(2), {
    type: "configure",
    rules: { ...saved.rules, money: 99, hands: 10 },
  });
  expect(gameReducer(menu, { type: "resume", state: saved })).toEqual(saved);
  expect(gameReducer(saved, { type: "resume", state: menu })).toBe(saved);
});

it("TC-125: unavailable storage reports failure without changing the live run", () => {
  const state = gameReducer(createGame(1), { type: "start" });
  const before = structuredClone(state);
  vi.stubGlobal("window", {
    localStorage: {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("quota");
      },
    },
  });
  try {
    expect(saveRun(state)).toBe(false);
    expect(loadRun().status).toBe("unavailable");
    expect(state).toEqual(before);
  } finally {
    vi.unstubAllGlobals();
  }
});

it("TC-127: run-wide Supernova history survives saves and incomplete legacy history is incompatible", () => {
  let state = gameReducer(createGame(1), { type: "start" });
  state = gameReducer(
    gameReducer(state, { type: "play", ids: [state.hand[0].id] }),
    { type: "animationDone" },
  );
  state = gameReducer(
    { ...state, round: 3, phase: "shop" },
    { type: "nextRound" },
  );
  const save = serializeRun(state)!;
  expect(parseRun(save).state?.runHandCounts.high).toBe(1);
  expect(
    parseRun(JSON.stringify({ ...JSON.parse(save), rulesVersion: 1 })).status,
  ).toBe("unsupported");
});

it("TC-135: legacy shop saves prepare upcoming suits deterministically without losing the run", () => {
  const state = {
    ...gameReducer(createGame(1), { type: "start" }),
    phase: "shop" as const,
    jokers: [
      {
        id: 1000,
        kind: "ancient_joker" as const,
        targetSuit: "hearts" as const,
      },
    ],
  };
  const legacy = JSON.stringify({ version: 1, rulesVersion: 2, state });
  const restored = parseRun(legacy).state!;
  expect(restored.jokers[0].targetRound).toBe(2);
  expect(parseRun(legacy).state).toEqual(restored);
  expect(parseRun(serializeRun(restored)).state).toEqual(restored);
  const next = gameReducer(restored, { type: "nextRound" });
  expect(next.jokers[0]).toEqual(restored.jokers[0]);
});

it("TC-137: migrated sold offers and owned cards share the same next-round target", () => {
  const state = {
    ...gameReducer(createGame(1), { type: "start" }),
    phase: "shop" as const,
    jokers: [{ id: 1000, kind: "ancient_joker" as const }],
    offers: [{ id: 1000, kind: "ancient_joker" as const, sold: true }],
  };
  const restored = parseRun(
    JSON.stringify({ version: 1, rulesVersion: 2, state }),
  ).state!;
  expect(restored.offers[0].targetSuit).toBe(restored.jokers[0].targetSuit);
  expect(restored.offers[0].targetRound).toBe(2);
});
