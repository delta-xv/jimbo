import {
  copyRules,
  DEFAULT_RULES,
  validRules,
  type RunRules,
} from "../game/rules";
import { readStored, writeStored } from "../storage/storage";
export type AnimationSpeed = "normal" | "fast" | "instant";
export interface AudioSettings {
  readonly music: boolean;
  readonly effects: boolean;
  readonly musicVolume: number;
  readonly effectsVolume: number;
}
export const DEFAULT_AUDIO: AudioSettings = {
  music: true,
  effects: true,
  musicVolume: 30,
  effectsVolume: 65,
};
export interface Settings {
  readonly version: 6;
  readonly animation: AnimationSpeed;
  readonly crt: boolean;
  readonly audio: AudioSettings;
  readonly rules: RunRules;
}
export const SETTINGS_KEY = "jimbo:settings";
export function defaultSettings(): Settings {
  return {
    version: 6,
    animation: "normal",
    crt: true,
    audio: { ...DEFAULT_AUDIO },
    rules: copyRules(DEFAULT_RULES),
  };
}
export function parseSettings(value: unknown): Settings {
  return validateSettings(value) ?? defaultSettings();
}
export function validateSettings(value: unknown): Settings | null {
  if (typeof value !== "object" || value === null) return null;
  const data = value as Record<string, unknown>;
  let rules = data.rules;
  if (data.version === 1 && typeof rules === "object" && rules !== null) {
    const old = rules as Record<string, unknown>;
    if (
      Array.isArray(old.targets) &&
      old.targets.length === 3 &&
      old.targets.every(
        (value, index, all) =>
          typeof value === "number" &&
          Number.isInteger(value) &&
          value >= 50 &&
          value <= 50000 &&
          (index === 0 || all[index - 1] < value),
      )
    )
      rules = { ...old, targets: DEFAULT_RULES.targets };
  }
  if (data.version === 2 && typeof rules === "object" && rules !== null) {
    const old = rules as Record<string, unknown>;
    if (
      old.money === 4 &&
      old.hands === 4 &&
      old.discards === 4 &&
      JSON.stringify(old.targets) ===
        JSON.stringify([300, 450, 800, 1500, 2500, 4000, 7000, 12000, 20000])
    )
      rules = copyRules(DEFAULT_RULES);
  }
  if (
    (data.version === 3 || data.version === 4) &&
    typeof rules === "object" &&
    rules !== null
  ) {
    const old = rules as Record<string, unknown>;
    if (
      old.money === 5 &&
      old.hands === 4 &&
      old.discards === 4 &&
      JSON.stringify(old.targets) ===
        JSON.stringify([300, 450, 600, 1000, 1500, 2000, 10000, 15000, 20000])
    )
      rules = { ...old, targets: DEFAULT_RULES.targets };
  }
  if (
    (data.version !== 1 &&
      data.version !== 2 &&
      data.version !== 3 &&
      data.version !== 4 &&
      data.version !== 5 &&
      data.version !== 6) ||
    typeof data.animation !== "string" ||
    !["normal", "fast", "instant"].includes(data.animation) ||
    typeof data.crt !== "boolean" ||
    !validRules(rules)
  )
    return null;
  const audio =
    typeof data.audio === "object" && data.audio !== null
      ? (data.audio as Record<string, unknown>)
      : {};
  const volume = (value: unknown, fallback: number) =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
      ? value
      : fallback;
  return {
    version: 6,
    audio: {
      music:
        typeof audio.music === "boolean" ? audio.music : DEFAULT_AUDIO.music,
      effects:
        typeof audio.effects === "boolean"
          ? audio.effects
          : DEFAULT_AUDIO.effects,
      musicVolume: volume(audio.musicVolume, DEFAULT_AUDIO.musicVolume),
      effectsVolume: volume(audio.effectsVolume, DEFAULT_AUDIO.effectsVolume),
    },
    animation: data.animation as AnimationSpeed,
    crt: data.crt,
    rules: copyRules(rules as RunRules),
  };
}
export function loadSettings(): Settings {
  try {
    return parseSettings(
      JSON.parse(readStored(SETTINGS_KEY) ?? "null"),
    );
  } catch {
    return defaultSettings();
  }
}
export function saveSettings(settings: Settings): void {
  try {
    writeStored(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}
