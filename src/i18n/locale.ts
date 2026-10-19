import { readStored } from "../storage/storage";

export type Locale = "zh-CN" | "en";
export const LOCALE_KEY = "jimbo:locale";
export function loadLocale(browserLanguage: string): Locale {
  let stored: unknown = null;
  try {
    stored = readStored(LOCALE_KEY);
  } catch {}
  return resolveLocale(stored, browserLanguage);
}
export function resolveLocale(
  stored: unknown,
  browserLanguage: string,
): Locale {
  if (stored === "zh-CN" || stored === "en") return stored;
  return browserLanguage.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}
