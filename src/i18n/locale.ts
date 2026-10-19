export type Locale = "zh-CN" | "en";
export const LOCALE_KEY = "jimbo:locale";
export function resolveLocale(
  stored: unknown,
  browserLanguage: string,
): Locale {
  if (stored === "zh-CN" || stored === "en") return stored;
  return browserLanguage.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}
