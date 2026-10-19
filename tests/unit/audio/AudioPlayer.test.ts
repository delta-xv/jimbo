import { afterEach, expect, it, vi } from "vitest";
import { AudioPlayer } from "../../../src/audio/AudioPlayer";
import { DEFAULT_AUDIO } from "../../../src/settings/settings";
class Context {
  state = "running";
  destination = {};
  sources: {
    stop: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
  }[] = [];
  resume = vi.fn(async () => {
    this.state = "running";
  });
  suspend = vi.fn(async () => {
    this.state = "suspended";
  });
  close = vi.fn(async () => {
    this.state = "closed";
  });
  createGain = () => ({ gain: { value: 0 }, connect: vi.fn() });
  decodeAudioData = vi.fn(async () => ({}));
  createBufferSource = () => {
    const source = {
      buffer: null,
      playbackRate: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
    this.sources.push(source);
    return source;
  };
}
function setup() {
  const contexts: Context[] = [];
  vi.stubGlobal(
    "AudioContext",
    class extends Context {
      constructor() {
        super();
        contexts.push(this);
      }
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    })),
  );
  const music = {
    loop: false,
    volume: 0,
    preload: "none",
    paused: true,
    play: vi.fn(async () => {
      music.paused = false;
    }),
    pause: vi.fn(() => {
      music.paused = true;
    }),
  };
  const player = new AudioPlayer(music as unknown as HTMLAudioElement);
  return { contexts, music, player };
}
afterEach(() => vi.unstubAllGlobals());
it("TC-140: audio waits for a gesture and switches mute music and effects independently", async () => {
  const { player, music, contexts } = setup();
  player.configure(DEFAULT_AUDIO);
  expect(music.play).not.toHaveBeenCalled();
  player.unlock();
  await player.play("card_select");
  expect(music.play).toHaveBeenCalled();
  expect(contexts[0].sources[0].start).toHaveBeenCalled();
  player.configure({ ...DEFAULT_AUDIO, effects: false });
  expect(contexts[0].sources[0].stop).toHaveBeenCalled();
  await player.play("card_select");
  expect(contexts[0].sources).toHaveLength(1);
  expect(music.paused).toBe(false);
  player.configure({ ...DEFAULT_AUDIO, music: false });
  expect(music.paused).toBe(true);
  await player.play("card_select");
  expect(contexts[0].sources).toHaveLength(2);
  player.dispose();
});
it("TC-141: backgrounding and teardown cancel pending sounds without replaying them on return", async () => {
  const { player, music, contexts } = setup();
  let resolve!: (data: object) => void;
  player.unlock();
  contexts[0].decodeAudioData = vi.fn(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const pending = player.play("win");
  await vi.waitFor(() => expect(resolve).toBeDefined());
  player.setActive(false);
  resolve({});
  await pending;
  expect(contexts[0].sources).toHaveLength(0);
  expect(music.paused).toBe(true);
  player.setActive(true);
  expect(music.play).toHaveBeenCalledTimes(2);
  player.dispose();
  await player.play("button");
  expect(contexts[0].sources).toHaveLength(0);
  expect(contexts[0].close).toHaveBeenCalled();
});

it("TC-182: playback failures remain contained and the next gesture can retry", async () => {
  const { player, music } = setup();
  music.play.mockImplementationOnce(() => { throw new Error("interrupted"); });
  expect(() => player.unlock()).not.toThrow();
  music.play.mockRejectedValueOnce(new Error("gesture required"));
  expect(() => player.unlock()).not.toThrow();
  await Promise.resolve();
  player.unlock();
  expect(music.paused).toBe(false);
  player.dispose();
});

it("TC-183: an active foreground notification retries interrupted audio without replaying effects", async () => {
  const { player, music, contexts } = setup();
  player.unlock();
  await player.play("button");
  music.paused = true;
  contexts[0].state = "interrupted";
  player.setActive(true);
  expect(contexts[0].resume).toHaveBeenCalledOnce();
  expect(music.paused).toBe(false);
  expect(contexts[0].sources).toHaveLength(1);
  player.dispose();
});
