import { afterEach, beforeEach, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  platform: "ios",
  get: vi.fn<(options: { key: string }) => Promise<{ value: string | null }>>(),
  set: vi.fn<(options: { key: string; value: string }) => Promise<void>>(),
  remove: vi.fn<(options: { key: string }) => Promise<void>>(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => native.platform },
}));
vi.mock("@capacitor/preferences", () => ({ Preferences: native }));

let legacy: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  native.platform = "ios";
  native.get.mockReset().mockResolvedValue({ value: null });
  native.set.mockReset().mockResolvedValue();
  native.remove.mockReset().mockResolvedValue();
  legacy = new Map();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => legacy.get(key) ?? null,
      setItem: (key: string, value: string) => legacy.set(key, value),
      removeItem: (key: string) => legacy.delete(key),
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

it("TC-172: iOS blocks access until hydration and retains native data over legacy data", async () => {
  const storage = await import("../../../src/storage/storage");
  legacy.set("key", "legacy");
  let finish!: (value: { value: string | null }) => void;
  native.get.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const pending = storage.initializeStorage({ key: () => true });
  expect(() => storage.readStored("key")).toThrow();
  expect(() => storage.writeStored("key", "default")).toThrow();
  expect(native.set).not.toHaveBeenCalled();
  finish({ value: "native" });
  await pending;
  expect(storage.readStored("key")).toBe("native");
  expect(legacy.get("key")).toBe("legacy");
  expect(native.set).not.toHaveBeenCalled();
});

it("TC-173: only valid legacy values migrate into empty native keys and the source survives", async () => {
  const storage = await import("../../../src/storage/storage");
  legacy.set("valid", "yes");
  legacy.set("invalid", "broken");
  legacy.set("native-invalid", "yes");
  native.get.mockImplementation(async ({ key }) => ({ value: key === "native-invalid" ? "corrupt" : null }));
  const valid = (value: string) => value === "yes";
  await storage.initializeStorage({ valid, invalid: valid, "native-invalid": valid });
  expect(native.set.mock.calls).toEqual([[{ key: "valid", value: "yes" }]]);
  expect(storage.readStored("valid")).toBe("yes");
  expect(storage.readStored("invalid")).toBeNull();
  expect(storage.readStored("native-invalid")).toBe("corrupt");
  expect(legacy.get("valid")).toBe("yes");
  expect(legacy.get("invalid")).toBe("broken");
});

it("TC-174: slow native writes and removal commit in action order while reads see the latest value", async () => {
  const storage = await import("../../../src/storage/storage");
  await storage.initializeStorage({ key: () => true });
  let finish!: () => void;
  native.set.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  storage.writeStored("key", "older");
  storage.writeStored("key", "newer");
  expect(storage.readStored("key")).toBe("newer");
  await vi.waitFor(() => expect(finish).toBeDefined());
  expect(native.set).toHaveBeenCalledTimes(1);
  const flushed = storage.flushStorage();
  finish();
  expect(await flushed).toBe(true);
  expect(native.set.mock.calls.map(([entry]) => entry.value)).toEqual(["older", "newer"]);
  storage.removeStored("key");
  expect(storage.readStored("key")).toBeNull();
  expect(await storage.flushStorage()).toBe(true);
  expect(native.set).toHaveBeenCalledTimes(3);
  expect(native.set.mock.calls[2][0].key).toBe("key");
});

it("TC-175: a rejected native write reports failure and does not block a newer save", async () => {
  const storage = await import("../../../src/storage/storage");
  await storage.initializeStorage({ key: () => true });
  const failed = vi.fn();
  const unsubscribe = storage.onStorageError(failed);
  native.set.mockRejectedValueOnce(new Error("disk unavailable"));
  storage.writeStored("key", "older");
  expect(await storage.flushStorage()).toBe(false);
  expect(failed).toHaveBeenCalledOnce();
  expect(storage.readStored("key")).toBe("older");
  storage.writeStored("key", "newer");
  expect(await storage.flushStorage()).toBe(true);
  expect(native.set).toHaveBeenLastCalledWith({ key: "key", value: "newer" });
  unsubscribe();
});

it("TC-176: failed hydration or migration leaves legacy data intact and permits a safe retry", async () => {
  const storage = await import("../../../src/storage/storage");
  legacy.set("key", "saved");
  native.get.mockRejectedValueOnce(new Error("unavailable"));
  await expect(storage.initializeStorage({ key: () => true })).rejects.toThrow();
  expect(() => storage.writeStored("key", "default")).toThrow();
  native.set.mockRejectedValueOnce(new Error("unavailable"));
  await expect(storage.initializeStorage({ key: () => true })).rejects.toThrow();
  expect(legacy.get("key")).toBe("saved");
  await storage.initializeStorage({ key: () => true });
  expect(storage.readStored("key")).toBe("saved");
});

it.each(["web", "android"])("TC-177: %s keeps synchronous localStorage without native migration", async (platform) => {
  native.platform = platform;
  const storage = await import("../../../src/storage/storage");
  legacy.set("key", "old");
  await storage.initializeStorage({ key: () => true });
  expect(storage.readStored("key")).toBe("old");
  storage.writeStored("key", "new");
  expect(legacy.get("key")).toBe("new");
  storage.removeStored("key");
  expect(legacy.has("key")).toBe(false);
  expect(native.get).not.toHaveBeenCalled();
  expect(native.set).not.toHaveBeenCalled();
});

it("TC-184: clearing a native save never resurrects the retained migration source on a cold launch", async () => {
  const disk = new Map<string, string>();
  native.get.mockImplementation(async ({ key }) => ({ value: disk.get(key) ?? null }));
  native.set.mockImplementation(async ({ key, value }) => { disk.set(key, value); });
  native.remove.mockImplementation(async ({ key }) => { disk.delete(key); });
  legacy.set("key", "finished-run");
  const storage = await import("../../../src/storage/storage");
  await storage.initializeStorage({ key: () => true });
  storage.removeStored("key");
  await storage.flushStorage();
  vi.resetModules();
  const relaunched = await import("../../../src/storage/storage");
  await relaunched.initializeStorage({ key: () => true });
  expect(relaunched.readStored("key")).toBeNull();
  expect(legacy.get("key")).toBe("finished-run");
});
