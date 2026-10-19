import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LOCALE_KEY, resolveLocale, type Locale } from "./locale";
import { translate, cardName, formatStep, formatNumber } from "./format";
import { handNames, jokerTexts, type MessageKey } from "./messages";
import type { Card, HandId, JokerId, ScoreStep } from "../game/types";

function initialLanguage(): Locale {
  let stored: unknown = null;
  try {
    stored = window.localStorage.getItem(LOCALE_KEY);
  } catch {}
  return resolveLocale(stored, navigator.language);
}
function createText(locale: Locale) {
  return {
    locale,
    t: (key: MessageKey, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    handName: (id: HandId) => handNames[locale][id],
    jokerText: (id: JokerId) => jokerTexts[locale][id],
    cardName: (card: Pick<Card, "rank" | "suit">) => cardName(card, locale),
    formatStep: (step: ScoreStep) => formatStep(step, locale),
    number: (value: number) => formatNumber(value, locale),
  };
}
const Context = createContext<
  | (ReturnType<typeof createText> & { setLocale: (locale: Locale) => void })
  | null
>(null);
export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(
    () => initialLocale ?? initialLanguage(),
  );
  const value = useMemo(() => ({ ...createText(locale), setLocale }), [locale]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, "title");
    try {
      window.localStorage.setItem(LOCALE_KEY, locale);
    } catch {}
  }, [locale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useI18n() {
  const value = useContext(Context);
  if (!value) throw new Error("I18nProvider is required");
  return value;
}
