import { expect, it, vi } from "vitest";
import {
  createPractice,
  practiceReducer,
  hasSeenTutorial,
  markTutorialSeen,
} from "../../../src/tutorial/practice";
it("TC-148: the guided pair scores once, uses one hand and replaces only the chosen cards", () => {
  let state = createPractice();
  expect(practiceReducer(state, { type: "play" })).toBe(state);
  expect(practiceReducer(state, { type: "toggle", id: 99 })).toBe(state);
  state = practiceReducer(state, { type: "toggle", id: 1 });
  state = practiceReducer(state, { type: "toggle", id: 2 });
  expect(practiceReducer(state, { type: "play" })).toBe(state);
  state = practiceReducer(state, { type: "toggle", id: 2 });
  state = practiceReducer(state, { type: "toggle", id: 3 });
  const original = structuredClone(state);
  const played = practiceReducer(state, { type: "play" });
  expect(played).toMatchObject({
    score: 56,
    hands: 3,
    played: true,
    selected: [],
  });
  expect(played.cards[1]).toEqual(state.cards[1]);
  expect(played.cards[3]).toEqual(state.cards[3]);
  expect(played.cards[0].rank).toBe("A");
  expect(played.cards[2].rank).toBe("6");
  expect(practiceReducer(played, { type: "play" })).toBe(played);
  expect(practiceReducer(played, { type: "toggle", id: 2 })).toBe(played);
  expect(state).toEqual(original);
  expect(practiceReducer(played, { type: "reset" })).toEqual(createPractice());
});

it("TC-149: the visit marker writes only its own key and tolerates unavailable storage", () => {
  const storage = new Map<string, string>([
    ["jimbo:run", "existing-run"],
    ["jimbo:settings", "existing-settings"],
  ]);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
  try {
    expect(hasSeenTutorial()).toBe(false);
    markTutorialSeen();
    expect(hasSeenTutorial()).toBe(true);
    expect(storage.get("jimbo:run")).toBe("existing-run");
    expect(storage.get("jimbo:settings")).toBe("existing-settings");
    vi.stubGlobal("window", {
      get localStorage() {
        throw Error("unavailable");
      },
    });
    expect(hasSeenTutorial()).toBe(false);
    expect(() => markTutorialSeen()).not.toThrow();
  } finally {
    vi.unstubAllGlobals();
  }
});
