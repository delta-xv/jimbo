import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const native = Capacitor.getPlatform() === "ios";
const REMOVED = "__jimbo_removed_v1__";
let ready = !native;
let initialization: Promise<void> | undefined;
const values = new Map<string, string | null>();
let writes = Promise.resolve();
const failures = new Set<string>();
const errorListeners = new Set<() => void>();

function persist(key: string, value: string | null) {
  values.set(key, value);
  writes = writes.then(async () => {
    try {
      await Preferences.set({ key, value: value ?? REMOVED });
      failures.delete(key);
    } catch {
      failures.add(key);
      errorListeners.forEach((listener) => listener());
    }
  });
}

export function initializeStorage(
  validators: Record<string, (value: string) => boolean>,
): Promise<void> {
  if (ready) return Promise.resolve();
  return initialization ??= Promise.all(
    Object.entries(validators).map(async ([key, valid]) => {
      let { value } = await Preferences.get({ key });
      if (value === null) {
        let legacy: string | null = null;
        try {
          legacy = window.localStorage.getItem(key);
        } catch {}
        if (legacy !== null && valid(legacy)) {
          await Preferences.set({ key, value: legacy });
          value = legacy;
        }
      }
      return [key, value === REMOVED ? null : value] as const;
    }),
  ).then((entries) => {
    entries.forEach(([key, value]) => values.set(key, value));
    ready = true;
  }).catch((error: unknown) => {
    initialization = undefined;
    throw error;
  });
}

function requireReady() {
  if (!ready) throw new Error("Storage is not initialized");
}

export function readStored(key: string): string | null {
  requireReady();
  return native ? values.get(key) ?? null : window.localStorage.getItem(key);
}

export function writeStored(key: string, value: string): void {
  requireReady();
  if (!native) window.localStorage.setItem(key, value);
  else persist(key, value);
}

export function removeStored(key: string): void {
  requireReady();
  if (!native) window.localStorage.removeItem(key);
  else persist(key, null);
}

export async function flushStorage(): Promise<boolean> {
  let pending;
  do {
    pending = writes;
    await pending;
  } while (pending !== writes);
  return failures.size === 0;
}

export function onStorageError(listener: () => void): () => void {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
}
