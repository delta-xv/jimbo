import { DEFAULT_AUDIO, type AudioSettings } from "../settings/settings";

const FILES = {
  button: "button",
  card_select: "card_select",
  card_deselect: "card_deselect",
  draw: "card_draw",
  chips: "chips_card",
  total: "chips_accum",
  mult: "mult",
  multiply: "xmult",
  pop: "pop",
  win: "game_win",
  lose: "negative_lose",
  discard: "whoosh2_lose",
} as const;
export type Sound = keyof typeof FILES;

export class AudioPlayer {
  private options: AudioSettings = DEFAULT_AUDIO;
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private buffers = new Map<Sound, Promise<AudioBuffer | null>>();
  private sources = new Set<AudioBufferSourceNode>();
  private active = true;
  private unlocked = false;
  private disposed = false;
  private generation = 0;
  constructor(private music: HTMLAudioElement) {
    music.loop = true;
    music.preload = "none";
  }
  configure(options: AudioSettings) {
    this.options = options;
    this.music.volume = (options.musicVolume / 100) * 0.6;
    if (this.gain) this.gain.gain.value = (options.effectsVolume / 100) * 0.7;
    if (!options.effects || !options.effectsVolume) this.stopEffects();
    this.syncMusic();
  }
  unlock() {
    if (this.disposed || !this.active) return;
    this.unlocked = true;
    if (this.options.effects && this.options.effectsVolume > 0) {
      try {
        if (!this.context) {
          this.context = new AudioContext();
          this.gain = this.context.createGain();
          this.gain.gain.value = (this.options.effectsVolume / 100) * 0.7;
          this.gain.connect(this.context.destination);
        }
        if (this.context.state !== "running")
          void this.context.resume().catch(() => {});
      } catch {}
    }
    this.syncMusic();
  }
  private syncMusic() {
    if (
      this.disposed ||
      !this.active ||
      !this.unlocked ||
      !this.options.music ||
      this.options.musicVolume === 0
    ) {
      this.music.pause();
    } else if (this.music.paused) {
      void this.music.play().catch(() => {});
    }
  }
  setActive(active: boolean) {
    if (this.disposed || this.active === active) return;
    this.active = active;
    if (!active) {
      this.stopEffects();
      void this.context?.suspend().catch(() => {});
    } else if (this.unlocked) {
      void this.context?.resume().catch(() => {});
    }
    this.syncMusic();
  }
  private buffer(sound: Sound) {
    if (!this.buffers.has(sound)) {
      const context = this.context!;
      const promise = fetch(`/audio/${FILES[sound]}.wav`)
        .then((response) => {
          if (!response.ok) throw Error("Audio unavailable");
          return response.arrayBuffer();
        })
        .then((data) => context.decodeAudioData(data))
        .catch(() => {
          this.buffers.delete(sound);
          return null;
        });
      this.buffers.set(sound, promise);
    }
    return this.buffers.get(sound)!;
  }
  async play(sound: Sound, rate = 1) {
    if (
      this.disposed ||
      !this.active ||
      !this.unlocked ||
      !this.options.effects ||
      !this.options.effectsVolume ||
      !this.context ||
      !this.gain
    )
      return;
    const generation = this.generation;
    const requested = performance.now();
    const buffer = await this.buffer(sound);
    if (
      !buffer ||
      generation !== this.generation ||
      this.disposed ||
      !this.active ||
      this.context.state !== "running" ||
      performance.now() - requested > 400
    )
      return;
    if (this.sources.size >= 8) {
      const oldest = this.sources.values().next().value!;
      oldest.stop();
      this.sources.delete(oldest);
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = Math.max(0.5, Math.min(2, rate));
    source.connect(this.gain);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
    };
    this.sources.add(source);
    source.start();
  }
  private stopEffects() {
    this.generation++;
    this.sources.forEach((source) => {
      source.stop();
      source.disconnect();
    });
    this.sources.clear();
  }
  dispose() {
    this.disposed = true;
    this.stopEffects();
    this.music.pause();
    this.buffers.clear();
    void this.context?.close().catch(() => {});
  }
}
