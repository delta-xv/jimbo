import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createGame, gameReducer } from "../../src/game/reducer";
import type { Action } from "../../src/game/types";
import fixture from "../fixtures/winning-run.json";

const preferences = vi.hoisted(() => new Map<string, string>());
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "ios" } }));
vi.mock("@capacitor/preferences", () => ({ Preferences: {
  get: async ({ key }: { key: string }) => ({ value: preferences.get(key) ?? null }),
  set: async ({ key, value }: { key: string; value: string }) => { preferences.set(key, value); },
  remove: async ({ key }: { key: string }) => { preferences.delete(key); },
} }));
let legacy: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  preferences.clear();
  legacy = new Map();
  vi.stubGlobal("window", { localStorage: {
    getItem: (key: string) => legacy.get(key) ?? null,
    setItem: (key: string, value: string) => legacy.set(key, value),
    removeItem: (key: string) => legacy.delete(key),
  } });
});
afterEach(() => vi.unstubAllGlobals());

it("TC-178: boot hydrates the saved run, settings, language and tutorial before their consumers load", async () => {
  const { serializeRun, loadRun, saveRun } = await import("../../src/save/run");
  const { defaultSettings, loadSettings } = await import("../../src/settings/settings");
  const { hasSeenTutorial } = await import("../../src/tutorial/practice");
  const { loadLocale } = await import("../../src/i18n/locale");
  const { prepareStorage } = await import("../../src/storage/initialize");
  const state = gameReducer(createGame(52), { type: "start" });
  const settings = { ...defaultSettings(), animation: "instant", crt: false };
  preferences.set("jimbo:run", serializeRun(state)!);
  preferences.set("jimbo:settings", JSON.stringify(settings));
  preferences.set("jimbo:locale", "en");
  preferences.set("jimbo:tutorial-seen:v1", "yes");
  legacy.set("jimbo:locale", "zh-CN");
  await prepareStorage();
  expect(loadRun().state).toEqual(state);
  expect(loadSettings()).toEqual(settings);
  expect(loadLocale("zh-CN")).toBe("en");
  expect(hasSeenTutorial()).toBe(true);
  const next = gameReducer(state, { type: "discard", ids: [state.hand[0].id] });
  expect(saveRun(next)).toBe(true);
  const { flushStorage } = await import("../../src/storage/storage");
  expect(await flushStorage()).toBe(true);
  expect(preferences.get("jimbo:run")).toBe(serializeRun(next));
});

it("TC-179: invalid legacy values never migrate and remain available at their source", async () => {
  const { prepareStorage } = await import("../../src/storage/initialize");
  legacy.set("jimbo:run", "{broken");
  legacy.set("jimbo:settings", JSON.stringify({ version: 99 }));
  legacy.set("jimbo:locale", "fr");
  legacy.set("jimbo:tutorial-seen:v1", "no");
  await prepareStorage();
  expect(preferences.size).toBe(0);
  expect(legacy.size).toBe(4);
});

it("TC-185: every native checkpoint cold-loads the same settled run and completion stays cleared", async () => {
  let run = await import("../../src/save/run");
  let state = gameReducer(createGame(fixture.seed), { type: "start" });
  legacy.set("jimbo:run", run.serializeRun(state)!);
  await (await import("../../src/storage/initialize")).prepareStorage();
  for (const { action } of fixture.route) {
    state = gameReducer(state, action as Action);
    const expected = gameReducer(state, { type: "animationDone" });
    expect(run.saveRun(state)).toBe(true);
    expect(await (await import("../../src/storage/storage")).flushStorage()).toBe(true);
    vi.resetModules();
    await (await import("../../src/storage/initialize")).prepareStorage();
    run = await import("../../src/save/run");
    const loaded = run.loadRun();
    if (expected.phase === "won") expect(loaded.status).toBe("empty");
    else expect(loaded.state).toEqual(expected);
    state = expected;
  }
  expect(state.phase).toBe("won");
  expect(legacy.get("jimbo:run")).not.toBeNull();
});

it("TC-186: valid old settings migrate through the same versioned parser as browser settings", async () => {
  const { defaultSettings, loadSettings } = await import("../../src/settings/settings");
  legacy.set("jimbo:settings", JSON.stringify({
    ...defaultSettings(), version: 1, animation: "fast", crt: false,
    rules: { hands: 6, discards: 2, money: 12, targets: [300, 450, 700] },
  }));
  await (await import("../../src/storage/initialize")).prepareStorage();
  expect(loadSettings()).toMatchObject({ version: 6, animation: "fast", crt: false, rules: { hands: 6, discards: 2, money: 12 } });
  expect(loadSettings().rules.targets).toEqual(defaultSettings().rules.targets);
  expect(preferences.get("jimbo:settings")).toBe(legacy.get("jimbo:settings"));
});
