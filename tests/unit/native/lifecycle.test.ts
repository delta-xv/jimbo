import { afterEach, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ platform: "ios", addListener: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => native.platform } }));
vi.mock("@capacitor/app", () => ({ App: native }));
afterEach(() => { vi.resetModules(); native.addListener.mockReset(); });

it.each(["ios", "android", "web"])("TC-180: %s registers only supported lifecycle and back events", async (platform) => {
  native.platform = platform;
  const remove = vi.fn();
  native.addListener.mockResolvedValue({ remove });
  const { listenForNativeEvents } = await import("../../../src/native/lifecycle");
  const back = vi.fn();
  const stateChange = vi.fn();
  const cleanup = listenForNativeEvents({ back, stateChange });
  const events = native.addListener.mock.calls.map(([event]) => event);
  expect(events).toEqual(platform === "web" ? [] : platform === "ios" ? ["appStateChange"] : ["appStateChange", "backButton"]);
  if (platform !== "web") {
    native.addListener.mock.calls[0][1]({ isActive: false });
    expect(stateChange).toHaveBeenCalledWith(false);
  }
  cleanup();
  await vi.waitFor(() => expect(remove).toHaveBeenCalledTimes(events.length));
});

it("TC-181: cleanup handles late registrations and rejected native listeners without leaking callbacks", async () => {
  native.platform = "ios";
  let finish!: (handle: { remove: () => Promise<void> }) => void;
  native.addListener.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const { listenForNativeEvents } = await import("../../../src/native/lifecycle");
  const stateChange = vi.fn();
  const cleanup = listenForNativeEvents({ stateChange });
  cleanup();
  const remove = vi.fn(async () => {});
  finish({ remove });
  await Promise.resolve();
  native.addListener.mock.calls[0][1]({ isActive: false });
  expect(stateChange).not.toHaveBeenCalled();
  await vi.waitFor(() => expect(remove).toHaveBeenCalledOnce());
  native.addListener.mockRejectedValueOnce(new Error("unavailable"));
  listenForNativeEvents({ stateChange })();
  await Promise.resolve();
});
